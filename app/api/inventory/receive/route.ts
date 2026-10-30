import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Inventory } from '@/models/Inventory';
import { StockMovement } from '@/models/StockMovement';
import { Product } from '@/models/Product';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const ReceiveStockSchema = z.object({
  storeId: z.string().optional(),
  productId: z.string(),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  reason: z.string().min(2),
  referenceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('inventory.receive', req);
    const body = await req.json();
    const data = ReceiveStockSchema.parse(body);

    await connectDB();

    let targetStoreId = data.storeId;
    if (session.role !== 'Admin') {
      targetStoreId = session.storeId || undefined;
    }

    if (!targetStoreId) {
      return errorResponse(new Error('Store is required to receive inventory.'));
    }

    const product = await Product.findById(data.productId);
    if (!product) {
      return errorResponse(new Error('Product not found'), 404);
    }

    const inventory = await Inventory.findOneAndUpdate(
      { storeId: targetStoreId, productId: data.productId },
      { $inc: { quantity: data.quantity } },
      { upsert: true, returnDocument: 'after' }
    );

    const movement = await StockMovement.create({
      storeId: targetStoreId,
      productId: data.productId,
      change: data.quantity,
      movementType: 'Receive',
      reason: data.reason,
      referenceId: data.referenceId || '',
      performedBy: session.userId,
    });

    await logAuditEvent({
      action: 'INVENTORY_RECEIVED',
      module: 'Inventory',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetStoreId,
      details: {
        productId: product._id,
        sku: product.sku,
        receivedQuantity: data.quantity,
        newBalance: inventory.quantity,
        movementId: movement._id,
      },
    });

    return successResponse({ inventory, movement }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
