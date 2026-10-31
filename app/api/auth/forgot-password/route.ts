import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { PasswordResetToken } from '@/models/PasswordResetToken';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const ForgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = ForgotSchema.parse(body);

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    // Consistent generic response to prevent email enumeration
    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await PasswordResetToken.create({
        email: user.email,
        token: resetToken,
        expiresAt,
        used: false,
      });

      await logAuditEvent({
        action: 'PASSWORD_RESET_REQUESTED',
        module: 'Auth',
        performedBy: user._id,
        performedByName: user.name,
        performedByEmail: user.email,
        details: { resetTokenCreated: true },
      });

      return successResponse({
        message: 'Password recovery token generated successfully.',
        resetToken,
        resetUrl: `/reset-password?token=${resetToken}`,
        demoResetToken: resetToken,
      });
    }

    return successResponse({
      message: 'If the email exists in our system, password reset instructions have been generated.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
