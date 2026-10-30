import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { AuditLog } from '@/models/AuditLog';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('audit_logs.read', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const moduleParam = searchParams.get('module');
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const filter: Record<string, any> = {};

    if (moduleParam) filter.module = moduleParam;
    if (action) filter.action = action;

    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { performedByName: { $regex: search, $options: 'i' } },
        { performedByEmail: { $regex: search, $options: 'i' } },
        { 'details.message': { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(filter)
      .populate('storeId', 'name code')
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse({ logs });
  } catch (error) {
    return errorResponse(error);
  }
}
