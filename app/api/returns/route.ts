import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { ReturnRequest } from '@/models/ReturnRequest';
import { Sale } from '@/models/Sale';
import { logAuditEvent, createNotification } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateReturnSchema = z.object({
  saleId: z.string(),
  productPhoto: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        reason: z.string().min(2),
        productPhoto: z.string().optional(),
      })
    )
    .min(1),
  restockItems: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('sales.read_store', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const storeIdParam = searchParams.get('storeId');

    const filter: Record<string, any> = {};

    if (session.role !== 'Admin') {
      filter.storeId = session.storeId;
    } else if (storeIdParam) {
      filter.storeId = storeIdParam;
    }

    if (status) filter.status = status;

    const returns = await ReturnRequest.find(filter)
      .populate('saleId', 'invoiceNumber grandTotal customerName paymentMethod')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email')
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({ returns });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('refunds.request', req);
    const body = await req.json();
    const data = CreateReturnSchema.parse(body);

    await connectDB();
    const sale = await Sale.findById(data.saleId);
    if (!sale) {
      return errorResponse(new Error('Original sale transaction not found'), 404);
    }

    if (session.role !== 'Admin' && sale.storeId.toString() !== session.storeId) {
      throw new AuthError('Cannot request return on sales from another store.', 403);
    }

    if (sale.paymentStatus === 'Cancelled' || sale.paymentStatus === 'Refunded') {
      return errorResponse(new Error(`Sale is already ${sale.paymentStatus.toLowerCase()}. Returns not allowed.`));
    }

    // Verify items and compute refund amount
    let totalRefund = 0;
    const verifiedItems = [];

    for (const retItem of data.items) {
      const originalItem = sale.items.find(
        (i) => i.productId.toString() === retItem.productId
      );
      if (!originalItem) {
        return errorResponse(new Error(`Item with product ID ${retItem.productId} was not part of this sale.`));
      }

      if (retItem.quantity > originalItem.quantity) {
        return errorResponse(
          new Error(`Return quantity (${retItem.quantity}) exceeds purchased quantity (${originalItem.quantity}) for ${originalItem.name}.`)
        );
      }

      const itemRefundAmount = Math.round((originalItem.total / originalItem.quantity) * retItem.quantity);
      totalRefund += itemRefundAmount;

      verifiedItems.push({
        productId: originalItem.productId,
        name: originalItem.name,
        quantity: retItem.quantity,
        unitPrice: originalItem.unitPrice,
        refundAmount: itemRefundAmount,
        reason: retItem.reason,
        productPhoto: retItem.productPhoto || data.productPhoto || '',
      });
    }

    const returnRequest = await ReturnRequest.create({
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      storeId: sale.storeId,
      requestedBy: session.userId,
      items: verifiedItems,
      productPhoto: data.productPhoto || verifiedItems[0]?.productPhoto || '',
      totalRefundAmount: totalRefund,
      status: 'Pending',
      restockItems: data.restockItems,
    });

    await createNotification({
      storeId: sale.storeId,
      roleTarget: 'Store Manager',
      title: 'Return Request Pending Approval',
      message: `Return request created for ${sale.invoiceNumber} (₹${totalRefund.toLocaleString()}). Requires manager approval.`,
      type: 'approval_pending',
      link: '/returns',
    });

    await logAuditEvent({
      action: 'RETURN_REQUESTED',
      module: 'Refunds',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: sale.storeId,
      details: {
        returnRequestId: returnRequest._id,
        invoiceNumber: sale.invoiceNumber,
        totalRefund,
      },
    });

    return successResponse({ returnRequest }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
