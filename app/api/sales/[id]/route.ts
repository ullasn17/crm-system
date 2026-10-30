import { NextRequest } from 'next/server';
import { requireAuth, requireRecordAccess } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Sale } from '@/models/Sale';
import { Store } from '@/models/Store';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    await connectDB();
    const sale = await Sale.findById(id)
      .populate('storeId', 'name code address phone email')
      .populate('cashierId', 'name email')
      .populate('customerId', 'name phone email address')
      .lean();

    if (!sale) {
      return errorResponse(new Error('Sale transaction not found'), 404);
    }

    requireRecordAccess(sale, session);

    return successResponse({ sale });
  } catch (error) {
    return errorResponse(error);
  }
}
