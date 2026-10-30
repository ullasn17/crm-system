import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(body);

    await connectDB();
    const user = await User.findById(session.userId).select('+passwordHash');
    if (!user) {
      return errorResponse(new Error('User not found'));
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return errorResponse(new Error('Incorrect current password'));
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    await logAuditEvent({
      action: 'PASSWORD_CHANGED',
      module: 'Auth',
      performedBy: user._id,
      performedByName: user.name,
      performedByEmail: user.email,
    });

    return successResponse({ message: 'Password changed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
