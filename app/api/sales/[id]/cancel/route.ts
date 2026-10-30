import { NextRequest } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Sale } from '@/models/Sale';
import { Inventory } from '@/models/Inventory';
import { StockMovement } from '@/models/StockMovement';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CancelSaleSchema = z.object({
  reason: z.string().min(3, 'A cancellation reason is required'),
  restockItems: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['Admin', 'Store Manager'], req);
    const { id } = await params;
    const body = await req.json();
    const { reason, restockItems } = CancelSaleSchema.parse(body);

    await connectDB();
    const sale = await Sale.findById(id);
    if (!sale) {
      return errorResponse(new Error('Sale transaction not found'), 404);
    }

    if (session.role === 'Store Manager' && sale.storeId.toString() !== session.storeId) {
      throw new AuthError('Cannot cancel sales belonging to another store.', 403);
    }

    if (sale.paymentStatus === 'Cancelled') {
      return errorResponse(new Error('This sale has already been cancelled.'));
    }

    sale.paymentStatus = 'Cancelled';
    sale.notes = `${sale.notes ? sale.notes + '\n' : ''}Cancelled on ${new Date().toISOString()}: ${reason}`;
    await sale.save();

    // Restock items if enabled
    if (restockItems) {
      for (const item of sale.items) {
        await Inventory.findOneAndUpdate(
          { storeId: sale.storeId, productId: item.productId },
          { $inc: { quantity: item.quantity } }
        );

        await StockMovement.create({
          storeId: sale.storeId,
          productId: item.productId,
          change: item.quantity,
          movementType: 'Return',
          reason: `Restock from cancelled sale ${sale.invoiceNumber}: ${reason}`,
          referenceId: sale.invoiceNumber,
          performedBy: session.userId,
        });
      }
    }

    await logAuditEvent({
      action: 'SALE_CANCELLED',
      module: 'Sales',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: sale.storeId,
      details: {
        invoiceNumber: sale.invoiceNumber,
        grandTotal: sale.grandTotal,
        reason,
        restocked: restockItems,
      },
    });

    return successResponse({ message: 'Sale cancelled successfully', sale });
  } catch (error) {
    return errorResponse(error);
  }
}
