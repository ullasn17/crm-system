import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { createRazorpayOrder } from '@/lib/payments/razorpay';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const OrderRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  receipt: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Require cashier/sales create permission
    await requirePermission('sales.create', req);

    const body = await req.json();
    const data = OrderRequestSchema.parse(body);

    const receipt = data.receipt || `RCPT-${Date.now().toString().slice(-6)}`;
    const result = await createRazorpayOrder({
      amount: data.amount,
      receipt,
      notes: data.notes,
    });

    return successResponse({ order: result });
  } catch (error) {
    return errorResponse(error);
  }
}
