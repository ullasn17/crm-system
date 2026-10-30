import { NextRequest } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (session) {
      await logAuditEvent({
        action: 'AUTH_LOGOUT',
        module: 'Auth',
        performedBy: session.userId,
        performedByName: session.name,
        performedByEmail: session.email,
        storeId: session.storeId,
      });
    }

    await clearSessionCookie();
    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
