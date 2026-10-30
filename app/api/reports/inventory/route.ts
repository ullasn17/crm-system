import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Inventory } from '@/models/Inventory';
import { successResponse, errorResponse } from '@/lib/utils/api';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('reports.read_store', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');

    const matchFilter: Record<string, any> = {};
    if (session.role !== 'Admin') {
      matchFilter.storeId = new mongoose.Types.ObjectId(session.storeId!);
    } else if (storeIdParam) {
      matchFilter.storeId = new mongoose.Types.ObjectId(storeIdParam);
    }

    const valuationAgg = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalItemsCount: { $sum: '$quantity' },
          totalValuationRetail: { $sum: { $multiply: ['$quantity', '$product.price'] } },
          totalValuationCost: { $sum: { $multiply: ['$quantity', { $ifNull: ['$product.costPrice', 0] }] } },
          totalProducts: { $sum: 1 },
        },
      },
    ]);

    const lowStockItems = await Inventory.find({
      ...matchFilter,
      $expr: { $lte: ['$quantity', '$reorderThreshold'] },
    })
      .populate('productId', 'name sku category price')
      .populate('storeId', 'name code')
      .limit(50)
      .lean();

    return successResponse({
      valuation: valuationAgg[0] || {
        totalItemsCount: 0,
        totalValuationRetail: 0,
        totalValuationCost: 0,
        totalProducts: 0,
      },
      lowStockItems,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
