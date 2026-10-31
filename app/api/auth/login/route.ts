import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { verifyPassword } from '@/lib/auth/password';
import { signToken, setSessionCookie, SessionUser } from '@/lib/auth/session';
import { ROLE_DEFAULT_PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, rememberMe } = LoginSchema.parse(body);
    const normalizedEmail = email.trim().toLowerCase();

    await connectDB();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    // Generic error message if user not found or inactive
    if (!user) {
      await logAuditEvent({
        action: 'AUTH_LOGIN_FAILED',
        module: 'Auth',
        details: { email: normalizedEmail, reason: 'User not found' },
        ipAddress,
      });
      return errorResponse(new Error('Invalid email or password'), 401);
    }

    if (!user.isActive) {
      await logAuditEvent({
        action: 'AUTH_LOGIN_FAILED',
        module: 'Auth',
        performedBy: user._id,
        performedByName: user.name,
        performedByEmail: user.email,
        details: { email, reason: 'Account deactivated' },
        ipAddress,
      });
      return errorResponse(new Error('Account is deactivated. Please contact your administrator.'));
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await logAuditEvent({
        action: 'AUTH_LOGIN_FAILED',
        module: 'Auth',
        performedBy: user._id,
        performedByName: user.name,
        performedByEmail: user.email,
        details: { email, reason: 'Incorrect password' },
        ipAddress,
      });
      return errorResponse(new Error('Invalid email or password'), 401);
    }

    // Resolve permissions: Role default permissions + custom overrides
    const roleDoc = await Role.findOne({ name: user.role }).lean();
    const basePermissions = roleDoc?.permissions || ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    const customPermissions = user.customPermissions || [];
    const allPermissions = Array.from(new Set([...basePermissions, ...customPermissions]));

    const sessionUser: SessionUser = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId ? user.storeId.toString() : null,
      permissions: allPermissions,
    };

    const token = signToken(sessionUser);

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    await logAuditEvent({
      action: 'AUTH_LOGIN_SUCCESS',
      module: 'Auth',
      performedBy: user._id,
      performedByName: user.name,
      performedByEmail: user.email,
      storeId: user.storeId,
      details: { role: user.role },
      ipAddress,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        user: sessionUser,
        token,
      },
    });

    const cookieOptions: any = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    };
    if (rememberMe) {
      cookieOptions.maxAge = 7 * 24 * 60 * 60; // 7 days
    }
    res.cookies.set('crm_token', token, cookieOptions);

    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
