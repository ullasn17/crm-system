import { NextRequest } from 'next/server';
import { requirePermission, requireAuth, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Store } from '@/models/Store';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateStoreSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10).toUpperCase(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  settings: z.object({
    maxDiscountPercent: z.number().min(0).max(100).default(20),
    refundRequiresApproval: z.boolean().default(true),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    const stores = await Store.find(filter).sort({ name: 1 }).lean();
    return successResponse({ stores });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('stores.manage', req);
    if (session.role !== 'Admin') {
      throw new AuthError('Only Administrators can create new stores.', 403);
    }

    const body = await req.json();
    const data = CreateStoreSchema.parse(body);

    await connectDB();
    const existing = await Store.findOne({ code: data.code });
    if (existing) {
      return errorResponse(new Error(`A store with code '${data.code}' already exists.`));
    }

    const store = await Store.create({
      name: data.name,
      code: data.code,
      address: data.address || {},
      phone: data.phone || '',
      email: data.email || '',
      settings: data.settings || { maxDiscountPercent: 20, refundRequiresApproval: true },
      isActive: true,
    });

    await logAuditEvent({
      action: 'STORE_CREATED',
      module: 'Stores',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: store._id,
      details: { storeName: store.name, storeCode: store.code },
    });

    return successResponse({ store }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
