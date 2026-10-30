import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Product } from '@/models/Product';
import { Inventory } from '@/models/Inventory';
import { Store } from '@/models/Store';
import { StockMovement } from '@/models/StockMovement';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2).toUpperCase(),
  barcode: z.string().optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(18),
  initialStock: z.number().int().min(0).default(0),
  storeId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active') !== 'false';
    const storeId = searchParams.get('storeId') || (session.role !== 'Admin' ? session.storeId : undefined);

    const filter: Record<string, any> = {};
    if (activeOnly) filter.isActive = true;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 }).lean();

    // If storeId is known, enrich product with store stock quantity
    if (storeId) {
      const productIds = products.map((p) => p._id);
      const inventoryRecords = await Inventory.find({
        storeId,
        productId: { $in: productIds },
      }).lean();

      const invMap = new Map<string, number>();
      for (const inv of inventoryRecords) {
        invMap.set(inv.productId.toString(), inv.quantity);
      }

      const enriched = products.map((p) => ({
        ...p,
        stockQuantity: invMap.get(p._id.toString()) ?? 0,
      }));

      return successResponse({ products: enriched });
    }

    return successResponse({ products });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['Admin', 'Store Manager'], req);
    const body = await req.json();
    const data = CreateProductSchema.parse(body);

    await connectDB();

    const existing = await Product.findOne({ sku: data.sku });
    if (existing) {
      return errorResponse(new Error(`A product with SKU '${data.sku}' already exists.`));
    }

    const product = await Product.create({
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || '',
      category: data.category,
      description: data.description || '',
      price: data.price,
      costPrice: data.costPrice || 0,
      taxRate: data.taxRate,
      isActive: true,
    });

    // Automatically initialize inventory records for all active stores
    const stores = await Store.find({ isActive: true });

    // Determine which store(s) get initial stock
    let targetStoreIds: string[] = [];
    if (data.initialStock > 0) {
      if (data.storeId === 'all') {
        targetStoreIds = stores.map((s) => s._id.toString());
      } else if (data.storeId) {
        targetStoreIds = [data.storeId];
      } else if (session.storeId) {
        targetStoreIds = [session.storeId.toString()];
      } else if (stores.length > 0) {
        targetStoreIds = [stores[0]._id.toString()];
      }
    }

    for (const store of stores) {
      const isTarget = targetStoreIds.includes(store._id.toString());
      const initialQty = isTarget ? data.initialStock : 0;

      await Inventory.findOneAndUpdate(
        { storeId: store._id, productId: product._id },
        { storeId: store._id, productId: product._id, quantity: initialQty, reorderThreshold: 10 },
        { upsert: true, returnDocument: 'after' }
      );

      if (isTarget && data.initialStock > 0) {
        await StockMovement.create({
          storeId: store._id,
          productId: product._id,
          change: data.initialStock,
          movementType: 'Receive',
          reason: 'Initial stock added during product creation',
          referenceId: product.sku,
          performedBy: session.userId,
        });
      }
    }

    await logAuditEvent({
      action: 'PRODUCT_CREATED',
      module: 'Products',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      details: {
        productId: product._id,
        sku: product.sku,
        price: product.price,
        initialStock: data.initialStock,
        targetStores: targetStoreIds,
      },
    });

    return successResponse({ product, initialStock: data.initialStock }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
