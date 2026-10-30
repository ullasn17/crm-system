import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { verifyRazorpaySignature } from '@/lib/payments/razorpay';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const VerifyRequestSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requirePermission('sales.create', req);

    const body = await req.json();
    const data = VerifyRequestSchema.parse(body);

    const verification = verifyRazorpaySignature({
      orderId: data.orderId,
      paymentId: data.paymentId,
      signature: data.signature,
    });

    if (!verification.valid) {
      return errorResponse(new Error(verification.reason || 'Payment verification failed.'), 400);
    }

    return successResponse({ verified: true, message: 'Payment successfully verified.' });
  } catch (error) {
    return errorResponse(error);
  }
}
