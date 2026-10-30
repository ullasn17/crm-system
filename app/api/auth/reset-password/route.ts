import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { PasswordResetToken } from '@/models/PasswordResetToken';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const ResetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = ResetSchema.parse(body);

    await connectDB();
    const resetDoc = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetDoc) {
      return errorResponse(new Error('Invalid or expired password reset token'));
    }

    const user = await User.findOne({ email: resetDoc.email });
    if (!user) {
      return errorResponse(new Error('User not found'));
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    await user.save();

    resetDoc.used = true;
    await resetDoc.save();

    await logAuditEvent({
      action: 'PASSWORD_RESET_COMPLETED',
      module: 'Auth',
      performedBy: user._id,
      performedByName: user.name,
      performedByEmail: user.email,
    });

    return successResponse({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    return errorResponse(error);
  }
}
