import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { Task } from '@/models/Task';
import { Lead } from '@/models/Lead';
import { Sale } from '@/models/Sale';
import { successResponse, errorResponse } from '@/lib/utils/api';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('reports.read_store', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');

    const userFilter: Record<string, any> = { isActive: true };
    const scopeFilter: Record<string, any> = {};

    if (session.role !== 'Admin') {
      userFilter.storeId = new mongoose.Types.ObjectId(session.storeId!);
      scopeFilter.storeId = new mongoose.Types.ObjectId(session.storeId!);
    } else if (storeIdParam) {
      userFilter.storeId = new mongoose.Types.ObjectId(storeIdParam);
      scopeFilter.storeId = new mongoose.Types.ObjectId(storeIdParam);
    }

    const employees = await User.find(userFilter).select('name email role storeId').lean();

    const employeeMetrics = [];
    for (const emp of employees) {
      const totalTasks = await Task.countDocuments({ assignedTo: emp._id });
      const completedTasks = await Task.countDocuments({ assignedTo: emp._id, status: 'Completed' });
      const activeLeads = await Lead.countDocuments({ assignedStaffId: emp._id, status: { $nin: ['Converted', 'Lost'] } });
      const convertedLeads = await Lead.countDocuments({ assignedStaffId: emp._id, status: 'Converted' });
      const totalSalesAgg = await Sale.aggregate([
        { $match: { cashierId: emp._id, paymentStatus: 'Paid' } },
        { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]);

      employeeMetrics.push({
        userId: emp._id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        leads: {
          active: activeLeads,
          converted: convertedLeads,
          total: activeLeads + convertedLeads,
          conversionRate: activeLeads + convertedLeads > 0 ? Math.round((convertedLeads / (activeLeads + convertedLeads)) * 100) : 0,
        },
        sales: {
          count: totalSalesAgg[0]?.count || 0,
          revenue: totalSalesAgg[0]?.revenue || 0,
        },
      });
    }

    // Lead status breakdown
    const leadFunnel = await Lead.aggregate([
      { $match: scopeFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);

    return successResponse({
      employeeMetrics,
      leadFunnel,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
