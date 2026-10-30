import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Notification } from '@/models/Notification';
import { successResponse, errorResponse } from '@/lib/utils/api';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectDB();

    const recipientFilter: any[] = [
      { recipientId: new mongoose.Types.ObjectId(session.userId) },
      { roleTarget: session.role },
      { recipientId: null, roleTarget: null },
    ];

    if (session.storeId) {
      recipientFilter.push({ storeId: new mongoose.Types.ObjectId(session.storeId) });
    }

    const notifications = await Notification.find({
      $or: recipientFilter,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return successResponse({ notifications, unreadCount });
  } catch (error) {
    return errorResponse(error);
  }
}
