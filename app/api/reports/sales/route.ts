import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Sale } from '@/models/Sale';
import { Store } from '@/models/Store';
import { successResponse, errorResponse } from '@/lib/utils/api';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('reports.read_store', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');
    const range = searchParams.get('range') || '30d'; // 7d, 30d, 90d, 365d
    const format = searchParams.get('format'); // 'json' or 'csv'

    const matchFilter: Record<string, any> = {
      paymentStatus: { $ne: 'Cancelled' },
    };

    if (session.role !== 'Admin') {
      matchFilter.storeId = new mongoose.Types.ObjectId(session.storeId!);
    } else if (storeIdParam) {
      matchFilter.storeId = new mongoose.Types.ObjectId(storeIdParam);
    }

    // Date range filter
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '365d' ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    matchFilter.createdAt = { $gte: startDate };

    // Aggregations: Total Revenue, Total Transactions, Average Order Value
    const summaryAgg = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalTax: { $sum: '$taxTotal' },
          totalDiscount: { $sum: '$discountTotal' },
          totalTransactions: { $sum: 1 },
          avgOrderValue: { $avg: '$grandTotal' },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalRevenue: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalTransactions: 0,
      avgOrderValue: 0,
    };

    // Daily Sales Trend
    const dailyTrend = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          revenue: 1,
          transactions: 1,
          _id: 0,
        },
      },
    ]);

    // Payment Method Breakdown
    const paymentBreakdown = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          method: '$_id',
          total: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Store comparison (for Admin)
    let storeComparison: any[] = [];
    if (session.role === 'Admin') {
      storeComparison = await Sale.aggregate([
        { $match: { paymentStatus: { $ne: 'Cancelled' }, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$storeId',
            revenue: { $sum: '$grandTotal' },
            transactions: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: '_id',
            as: 'store',
          },
        },
        { $unwind: { path: '$store', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            storeId: '$_id',
            storeName: '$store.name',
            storeCode: '$store.code',
            revenue: 1,
            transactions: 1,
            _id: 0,
          },
        },
        { $sort: { revenue: -1 } },
      ]);
    }

    if (format === 'csv') {
      // Generate clean CSV output
      let csv = 'Date,Revenue,Transactions\n';
      for (const row of dailyTrend) {
        csv += `${row.date},${row.revenue},${row.transactions}\n`;
      }
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="sales-report.csv"',
        },
      });
    }

    return successResponse({
      summary,
      dailyTrend,
      paymentBreakdown,
      storeComparison,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
