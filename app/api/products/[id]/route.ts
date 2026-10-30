import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Product } from '@/models/Product';
import { Inventory } from '@/models/Inventory';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const UpdateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    await connectDB();
    const product = await Product.findById(id).lean();
    if (!product) {
      return errorResponse(new Error('Product not found'), 404);
    }

    // Include inventory breakdown
    const invFilter: Record<string, any> = { productId: id };
    if (session.role !== 'Admin' && session.storeId) {
      invFilter.storeId = session.storeId;
    }

    const inventoryRecords = await Inventory.find(invFilter).populate('storeId', 'name code').lean();

    return successResponse({ product, inventory: inventoryRecords });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['Admin', 'Store Manager'], req);
    const { id } = await params;
    const body = await req.json();
    const data = UpdateProductSchema.parse(body);

    await connectDB();
    const product = await Product.findById(id);
    if (!product) {
      return errorResponse(new Error('Product not found'), 404);
    }

    const priceChanged = data.price !== undefined && data.price !== product.price;
    const oldPrice = product.price;

    if (data.name !== undefined) product.name = data.name;
    if (data.category !== undefined) product.category = data.category;
    if (data.description !== undefined) product.description = data.description;
    if (data.price !== undefined) product.price = data.price;
    if (data.costPrice !== undefined) product.costPrice = data.costPrice;
    if (data.taxRate !== undefined) product.taxRate = data.taxRate;
    if (data.isActive !== undefined) product.isActive = data.isActive;

    await product.save();

    await logAuditEvent({
      action: priceChanged ? 'PRODUCT_PRICE_CHANGED' : 'PRODUCT_UPDATED',
      module: 'Products',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      details: {
        productId: product._id,
        sku: product.sku,
        priceChanged,
        oldPrice: priceChanged ? oldPrice : undefined,
        newPrice: priceChanged ? data.price : undefined,
        updatedFields: Object.keys(data),
      },
    });

    return successResponse({ product });
  } catch (error) {
    return errorResponse(error);
  }
}
