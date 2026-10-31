import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit/audit';

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

    const res = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });

    // Explicitly wipe the auth cookie on the response
    res.cookies.set('crm_token', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
