import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { Store } from '@/models/Store';
import { Customer } from '@/models/Customer';
import { Lead } from '@/models/Lead';
import { Task } from '@/models/Task';
import { Sale } from '@/models/Sale';
import { Inventory } from '@/models/Inventory';
import { ReturnRequest } from '@/models/ReturnRequest';
import { AuditLog } from '@/models/AuditLog';
import { successResponse, errorResponse } from '@/lib/utils/api';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');

    const effectiveStoreId =
      session.role === 'Admin'
        ? (storeIdParam ? new mongoose.Types.ObjectId(storeIdParam) : null)
        : (session.storeId ? new mongoose.Types.ObjectId(session.storeId) : null);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const storeFilter: Record<string, any> = effectiveStoreId ? { storeId: effectiveStoreId } : {};

    if (session.role === 'Admin' && !effectiveStoreId) {
      // 1. ADMIN GLOBAL DASHBOARD
      const [
        totalUsers,
        activeStores,
        totalCustomers,
        totalLeads,
        todaySalesAgg,
        monthlySalesAgg,
        lowStockCount,
        recentActivity,
        pendingApprovalsCount,
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Store.countDocuments({ isActive: true }),
        Customer.countDocuments({}),
        Lead.countDocuments({}),
        Sale.aggregate([
          { $match: { createdAt: { $gte: todayStart }, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: monthStart }, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Inventory.countDocuments({ $expr: { $lte: ['$quantity', '$reorderThreshold'] } }),
        AuditLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
        ReturnRequest.countDocuments({ status: 'Pending' }),
      ]);

      // Recent 7 days trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const salesTrend = await Sale.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, paymentStatus: 'Paid' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sales: { $sum: '$grandTotal' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', sales: 1, count: 1, _id: 0 } },
      ]);

      // Store-wise performance
      const storeComparison = await Sale.aggregate([
        { $match: { createdAt: { $gte: monthStart }, paymentStatus: 'Paid' } },
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
            storeName: '$store.name',
            storeCode: '$store.code',
            revenue: 1,
            transactions: 1,
            _id: 0,
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      return successResponse({
        role: 'Admin',
        metrics: {
          totalUsers,
          activeStores,
          totalCustomers,
          totalLeads,
          todaySales: todaySalesAgg[0]?.total || 0,
          todayTransactions: todaySalesAgg[0]?.count || 0,
          monthlyRevenue: monthlySalesAgg[0]?.total || 0,
          monthlyTransactions: monthlySalesAgg[0]?.count || 0,
          lowStockProducts: lowStockCount,
          pendingApprovals: pendingApprovalsCount,
        },
        salesTrend,
        storeComparison,
        recentActivity,
      });
    }

    if (session.role === 'Store Manager' || (session.role === 'Admin' && effectiveStoreId)) {
      // 2. STORE MANAGER DASHBOARD
      const [
        storeCustomers,
        todaySalesAgg,
        monthlySalesAgg,
        lowStockItems,
        pendingTasks,
        pendingApprovals,
        recentTransactions,
      ] = await Promise.all([
        Customer.countDocuments(storeFilter),
        Sale.aggregate([
          { $match: { ...storeFilter, createdAt: { $gte: todayStart }, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Sale.aggregate([
          { $match: { ...storeFilter, createdAt: { $gte: monthStart }, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Inventory.find({ ...storeFilter, $expr: { $lte: ['$quantity', '$reorderThreshold'] } })
          .populate('productId', 'name sku price')
          .limit(10)
          .lean(),
        Task.find({ ...storeFilter, status: { $ne: 'Completed' } })
          .populate('assignedTo', 'name email')
          .sort({ dueDate: 1 })
          .limit(8)
          .lean(),
        ReturnRequest.find({ ...storeFilter, status: 'Pending' })
          .populate('requestedBy', 'name email')
          .sort({ createdAt: -1 })
          .lean(),
        Sale.find(storeFilter).sort({ createdAt: -1 }).limit(8).lean(),
      ]);

      // Inventory valuation
      const valuationAgg = await Inventory.aggregate([
        { $match: storeFilter },
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
            totalValuation: { $sum: { $multiply: ['$quantity', '$product.price'] } },
            totalUnits: { $sum: '$quantity' },
          },
        },
      ]);

      return successResponse({
        role: 'Store Manager',
        metrics: {
          storeCustomers,
          todaySales: todaySalesAgg[0]?.total || 0,
          todayTransactions: todaySalesAgg[0]?.count || 0,
          monthlyRevenue: monthlySalesAgg[0]?.total || 0,
          monthlyTransactions: monthlySalesAgg[0]?.count || 0,
          inventoryValuation: valuationAgg[0]?.totalValuation || 0,
          inventoryUnits: valuationAgg[0]?.totalUnits || 0,
          lowStockCount: lowStockItems.length,
          pendingTasksCount: pendingTasks.length,
          pendingApprovalsCount: pendingApprovals.length,
        },
        lowStockItems,
        pendingTasks,
        pendingApprovals,
        recentTransactions,
      });
    }

    if (session.role === 'Staff') {
      // 3. STAFF DASHBOARD
      const userObjectId = new mongoose.Types.ObjectId(session.userId);

      const [assignedTasks, completedTasks, pendingFollowUps, myLeads, recentCustomers] =
        await Promise.all([
          Task.find({ assignedTo: userObjectId, status: { $ne: 'Completed' } })
            .sort({ dueDate: 1 })
            .limit(10)
            .lean(),
          Task.countDocuments({ assignedTo: userObjectId, status: 'Completed' }),
          Lead.find({
            assignedStaffId: userObjectId,
            followUpDate: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            status: { $nin: ['Converted', 'Lost'] },
          })
            .sort({ followUpDate: 1 })
            .limit(10)
            .lean(),
          Lead.find({ assignedStaffId: userObjectId }).sort({ createdAt: -1 }).limit(10).lean(),
          Customer.find({ assignedStaffId: userObjectId }).sort({ updatedAt: -1 }).limit(10).lean(),
        ]);

      return successResponse({
        role: 'Staff',
        metrics: {
          assignedTasksCount: assignedTasks.length,
          completedTasksCount: completedTasks,
          pendingFollowUpsCount: pendingFollowUps.length,
          myLeadsCount: myLeads.length,
        },
        assignedTasks,
        pendingFollowUps,
        myLeads,
        recentCustomers,
      });
    }

    // 4. COUNTER DASHBOARD
    const cashierObjectId = new mongoose.Types.ObjectId(session.userId);

    const [todayCounterSalesAgg, todayStoreSalesAgg, recentSales, pendingPayments] =
      await Promise.all([
        Sale.aggregate([
          {
            $match: {
              cashierId: cashierObjectId,
              createdAt: { $gte: todayStart },
              paymentStatus: 'Paid',
            },
          },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Sale.aggregate([
          {
            $match: {
              ...storeFilter,
              createdAt: { $gte: todayStart },
              paymentStatus: 'Paid',
            },
          },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Sale.find(storeFilter).sort({ createdAt: -1 }).limit(12).lean(),
        Sale.find({ ...storeFilter, paymentStatus: 'Pending' }).sort({ createdAt: -1 }).limit(10).lean(),
      ]);

    return successResponse({
      role: 'Counter',
      metrics: {
        myTodaySales: todayCounterSalesAgg[0]?.total || 0,
        myTodayCount: todayCounterSalesAgg[0]?.count || 0,
        storeTodaySales: todayStoreSalesAgg[0]?.total || 0,
        storeTodayCount: todayStoreSalesAgg[0]?.count || 0,
        pendingPaymentsCount: pendingPayments.length,
      },
      recentSales,
      pendingPayments,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
