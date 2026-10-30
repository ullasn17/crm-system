import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Customer } from '@/models/Customer';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  storeId: z.string().optional().nullable(),
  assignedStaffId: z.string().optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Lead']).default('Active'),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('customers.read', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const storeIdParam = searchParams.get('storeId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const filter: Record<string, any> = {};

    // Multi-store isolation: Non-admins are strictly bounded to their assigned store
    if (session.role !== 'Admin') {
      filter.storeId = session.storeId;
    } else if (storeIdParam) {
      filter.storeId = storeIdParam;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .populate('storeId', 'name code')
      .populate('assignedStaffId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return successResponse({
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('customers.create', req);
    const body = await req.json();
    const data = CreateCustomerSchema.parse(body);

    await connectDB();

    // Determine target store
    let targetStoreId = data.storeId;
    if (session.role !== 'Admin') {
      targetStoreId = session.storeId || undefined;
    }

    if (!targetStoreId) {
      return errorResponse(new Error('Store assignment is required for customer creation.'));
    }

    // Check duplicate phone in the same store
    const existing = await Customer.findOne({ storeId: targetStoreId, phone: data.phone });
    if (existing) {
      return errorResponse(new Error(`A customer with phone '${data.phone}' already exists in this store.`));
    }

    const customer = await Customer.create({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      address: data.address || '',
      storeId: targetStoreId,
      assignedStaffId: data.assignedStaffId || (session.role === 'Staff' ? session.userId : null),
      status: data.status || 'Active',
      notes: data.notes || '',
      createdBy: session.userId,
      interactions: [],
    });

    await logAuditEvent({
      action: 'CUSTOMER_CREATED',
      module: 'Customers',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetStoreId,
      details: { customerId: customer._id, customerName: customer.name, phone: customer.phone },
    });

    return successResponse({ customer }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
