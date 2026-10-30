import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { StockMovement } from '@/models/StockMovement';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('inventory.read', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');
    const movementType = searchParams.get('type');
    const productId = searchParams.get('productId');

    const filter: Record<string, any> = {};

    if (session.role !== 'Admin') {
      filter.storeId = session.storeId;
    } else if (storeIdParam) {
      filter.storeId = storeIdParam;
    }

    if (movementType) filter.movementType = movementType;
    if (productId) filter.productId = productId;

    const movements = await StockMovement.find(filter)
      .populate('productId', 'name sku price')
      .populate('storeId', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return successResponse({ movements });
  } catch (error) {
    return errorResponse(error);
  }
}
