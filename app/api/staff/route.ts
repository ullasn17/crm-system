import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');

    const filter: Record<string, any> = {
      isActive: true,
      role: { $in: ['Staff', 'Store Manager', 'Admin'] },
    };

    if (session.role !== 'Admin') {
      if (session.storeId) {
        filter.storeId = session.storeId;
      }
    } else if (storeIdParam) {
      filter.storeId = storeIdParam;
    }

    const staff = await User.find(filter)
      .populate('storeId', 'name code')
      .select('_id name email role storeId')
      .sort({ name: 1 })
      .lean();

    return successResponse({ staff });
  } catch (error) {
    return errorResponse(error);
  }
}
