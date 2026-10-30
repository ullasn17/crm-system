import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { createStripeCheckoutSession } from '@/lib/payments/stripe';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const SessionRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  receipt: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  storeId: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
      })
    )
    .optional(),
  returnUrl: z.string().optional(),
  paymentMethod: z.enum(['Online', 'Card', 'UPI', 'QR', 'Cash']).optional(),
  upiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Require cashier/sales create permission
    await requirePermission('sales.create', req);

    const body = await req.json();
    const data = SessionRequestSchema.parse(body);

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      (host ? `${proto}://${host}` : req.nextUrl.origin);
    const receipt = data.receipt || `RCPT-${Date.now().toString().slice(-6)}`;
    const method = data.paymentMethod || 'Online';
    const successUrl =
      data.returnUrl ||
      `${origin}/billing?stripe_status=success&session_id={CHECKOUT_SESSION_ID}&receipt=${receipt}&method=${method}`;
    const cancelUrl = `${origin}/billing?stripe_status=cancelled`;

    const result = await createStripeCheckoutSession({
      amount: data.amount,
      receipt,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      storeId: data.storeId,
      items: data.items,
      successUrl,
      cancelUrl,
      paymentMethod: method,
      upiKey: data.upiKey,
    });

    return successResponse({
      ...result,
      session: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
