import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { verifyStripeSession } from '@/lib/payments/stripe';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const VerifyRequestSchema = z.object({
  sessionId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requirePermission('sales.create', req);

    const body = await req.json();
    const data = VerifyRequestSchema.parse(body);

    const verification = await verifyStripeSession(data.sessionId);

    if (!verification.valid) {
      return errorResponse(new Error(verification.reason || 'Stripe payment verification failed.'), 400);
    }

    return successResponse({
      verified: true,
      paymentIntentId: verification.paymentIntentId,
      status: verification.status,
      paymentStatus: verification.paymentStatus,
      amountTotal: verification.amountTotal,
      message: 'Stripe payment verified successfully.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
