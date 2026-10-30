import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Inventory } from '@/models/Inventory';
import { StockMovement } from '@/models/StockMovement';
import { Product } from '@/models/Product';
import { logAuditEvent, createNotification } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const AdjustStockSchema = z.object({
  storeId: z.string().optional(),
  productId: z.string(),
  change: z.number().int().refine((val) => val !== 0, 'Change cannot be zero'),
  reason: z.string().min(2),
  referenceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('inventory.adjust', req);
    const body = await req.json();
    const data = AdjustStockSchema.parse(body);

    await connectDB();

    let targetStoreId = data.storeId;
    if (session.role !== 'Admin') {
      targetStoreId = session.storeId || undefined;
    }

    if (!targetStoreId) {
      return errorResponse(new Error('Store is required to adjust inventory.'));
    }

    const currentInventory = await Inventory.findOne({
      storeId: targetStoreId,
      productId: data.productId,
    });

    const currentQuantity = currentInventory ? currentInventory.quantity : 0;
    const targetQuantity = currentQuantity + data.change;

    if (targetQuantity < 0) {
      return errorResponse(
        new Error(`Cannot adjust stock: current stock is ${currentQuantity}, deduction of ${Math.abs(data.change)} would result in negative inventory.`)
      );
    }

    const inventory = await Inventory.findOneAndUpdate(
      { storeId: targetStoreId, productId: data.productId },
      { $inc: { quantity: data.change } },
      { upsert: true, returnDocument: 'after' }
    );

    const movement = await StockMovement.create({
      storeId: targetStoreId,
      productId: data.productId,
      change: data.change,
      movementType: 'Adjustment',
      reason: data.reason,
      referenceId: data.referenceId || '',
      performedBy: session.userId,
    });

    // Check for low-stock condition
    if (inventory.quantity <= inventory.reorderThreshold) {
      const product = await Product.findById(data.productId);
      await createNotification({
        storeId: targetStoreId,
        roleTarget: 'Store Manager',
        title: 'Low Stock Alert',
        message: `${product?.name || 'Product'} is low on stock (${inventory.quantity} remaining, threshold: ${inventory.reorderThreshold}).`,
        type: 'low_stock',
        link: '/inventory',
      });
    }

    await logAuditEvent({
      action: 'INVENTORY_ADJUSTED',
      module: 'Inventory',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetStoreId,
      details: {
        productId: data.productId,
        change: data.change,
        newBalance: inventory.quantity,
        reason: data.reason,
      },
    });

    return successResponse({ inventory, movement });
  } catch (error) {
    return errorResponse(error);
  }
}
