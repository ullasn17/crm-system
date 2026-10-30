import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Inventory } from '@/models/Inventory';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('inventory.read', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const filter: Record<string, any> = {};

    if (session.role !== 'Admin') {
      filter.storeId = session.storeId;
    } else if (storeIdParam) {
      filter.storeId = storeIdParam;
    }

    let inventory = await Inventory.find(filter)
      .populate('productId', 'name sku category price taxRate isActive')
      .populate('storeId', 'name code')
      .sort({ updatedAt: -1 })
      .lean();

    if (lowStockOnly) {
      inventory = inventory.filter((item: any) => item.quantity <= item.reorderThreshold);
    }

    return successResponse({ inventory });
  } catch (error) {
    return errorResponse(error);
  }
}
