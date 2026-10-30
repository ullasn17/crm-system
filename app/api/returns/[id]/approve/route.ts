import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { ReturnRequest } from '@/models/ReturnRequest';
import { Sale } from '@/models/Sale';
import { Inventory } from '@/models/Inventory';
import { StockMovement } from '@/models/StockMovement';
import { logAuditEvent, createNotification } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const ApproveSchema = z.object({
  action: z.enum(['Approved', 'Rejected']),
  comments: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('refunds.approve', req);
    const { id } = await params;
    const body = await req.json();
    const { action, comments } = ApproveSchema.parse(body);

    await connectDB();
    const returnReq = await ReturnRequest.findById(id);
    if (!returnReq) {
      return errorResponse(new Error('Return request not found'), 404);
    }

    if (session.role === 'Store Manager' && returnReq.storeId.toString() !== session.storeId) {
      throw new AuthError('Store Managers can only approve returns for their assigned store.', 403);
    }

    // Separation of duties: Prevent user from approving their own return request if not Admin
    if (session.role !== 'Admin' && returnReq.requestedBy.toString() === session.userId) {
      throw new AuthError('Separation of Duties Violation: You cannot approve a return request you created.', 403);
    }

    if (returnReq.status !== 'Pending') {
      return errorResponse(new Error(`This return request has already been ${returnReq.status.toLowerCase()}.`));
    }

    returnReq.status = action;
    returnReq.reviewedBy = session.userId as any;
    returnReq.reviewedAt = new Date();
    returnReq.reviewerComments = comments || '';
    await returnReq.save();

    if (action === 'Approved') {
      const sale = await Sale.findById(returnReq.saleId);
      if (sale) {
        sale.paymentStatus = 'Refunded';
        await sale.save();
      }

      // Restock items if enabled
      if (returnReq.restockItems) {
        for (const item of returnReq.items) {
          await Inventory.findOneAndUpdate(
            { storeId: returnReq.storeId, productId: item.productId },
            { $inc: { quantity: item.quantity } }
          );

          await StockMovement.create({
            storeId: returnReq.storeId,
            productId: item.productId,
            change: item.quantity,
            movementType: 'Return',
            reason: `Return approved for invoice ${returnReq.invoiceNumber}: ${item.reason}`,
            referenceId: returnReq.invoiceNumber,
            performedBy: session.userId,
          });
        }
      }

      await createNotification({
        recipientId: returnReq.requestedBy,
        storeId: returnReq.storeId,
        title: 'Return Request Approved',
        message: `Return for ${returnReq.invoiceNumber} (₹${returnReq.totalRefundAmount.toLocaleString()}) has been approved.`,
        type: 'approval_pending',
        link: '/returns',
      });
    }

    await logAuditEvent({
      action: action === 'Approved' ? 'RETURN_APPROVED' : 'RETURN_REJECTED',
      module: 'Refunds',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: returnReq.storeId,
      details: {
        returnRequestId: returnReq._id,
        invoiceNumber: returnReq.invoiceNumber,
        totalRefundAmount: returnReq.totalRefundAmount,
        action,
        comments,
      },
    });

    return successResponse({ returnRequest: returnReq });
  } catch (error) {
    return errorResponse(error);
  }
}
