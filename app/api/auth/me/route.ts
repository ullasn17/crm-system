import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/authorization';
import { clearSessionCookie } from '@/lib/auth/session';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { Store } from '@/models/Store';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      await clearSessionCookie();
      return successResponse({ user: null });
    }

    await connectDB();
    const userDoc = await User.findById(session.userId).lean();
    if (!userDoc || !userDoc.isActive) {
      await clearSessionCookie();
      return successResponse({ user: null });
    }

    let storeDetails: any = null;
    if (userDoc.storeId) {
      storeDetails = await Store.findById(userDoc.storeId).select('name code address phone').lean();
    }

    return successResponse({
      user: {
        userId: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        storeId: userDoc.storeId ? userDoc.storeId.toString() : null,
        store: storeDetails,
        permissions: session.permissions,
        phone: userDoc.phone,
        isActive: userDoc.isActive,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
