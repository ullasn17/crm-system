import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Notification } from '@/models/Notification';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req);
    const { id } = await params;

    await connectDB();
    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { isRead: true } },
      { returnDocument: 'after' }
    );

    return successResponse({ notification });
  } catch (error) {
    return errorResponse(error);
  }
}
