import { NextRequest } from 'next/server';
import { requireAuth, requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Store } from '@/models/Store';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const UpdateStoreSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
  settings: z.object({
    maxDiscountPercent: z.number().min(0).max(100).optional(),
    refundRequiresApproval: z.boolean().optional(),
  }).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req);
    const { id } = await params;

    await connectDB();
    const store = await Store.findById(id).lean();
    if (!store) {
      return errorResponse(new Error('Store not found'), 404);
    }

    return successResponse({ store });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const data = UpdateStoreSchema.parse(body);

    if (session.role !== 'Admin') {
      if (session.role === 'Store Manager' && session.storeId === id) {
        // Store Manager can only update phone, email, and address
        delete (data as any).isActive;
        delete (data as any).settings;
      } else {
        throw new AuthError('Forbidden. Only Admin can modify store settings.', 403);
      }
    }

    await connectDB();
    const store = await Store.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' });
    if (!store) {
      return errorResponse(new Error('Store not found'), 404);
    }

    await logAuditEvent({
      action: 'STORE_UPDATED',
      module: 'Stores',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: store._id,
      details: { updatedFields: Object.keys(data) },
    });

    return successResponse({ store });
  } catch (error) {
    return errorResponse(error);
  }
}
