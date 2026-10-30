import { NextRequest } from 'next/server';
import { requirePermission, requireRecordAccess, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Customer } from '@/models/Customer';
import { Sale } from '@/models/Sale';
import { Lead } from '@/models/Lead';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const UpdateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  assignedStaffId: z.string().optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Lead']).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('customers.read', req);
    const { id } = await params;

    await connectDB();
    const customer = await Customer.findById(id)
      .populate('storeId', 'name code')
      .populate('assignedStaffId', 'name email')
      .populate('interactions.staffId', 'name email')
      .lean();

    if (!customer) {
      return errorResponse(new Error('Customer not found'), 404);
    }

    requireRecordAccess(customer, session);

    // Fetch customer's purchase history and leads
    const purchases = await Sale.find({ customerId: customer._id })
      .select('invoiceNumber grandTotal paymentMethod paymentStatus createdAt items')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const relatedLeads = await Lead.find({
      $or: [{ convertedCustomerId: customer._id }, { phone: customer.phone }],
    }).lean();

    return successResponse({ customer, purchases, relatedLeads });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('customers.update', req);
    const { id } = await params;
    const body = await req.json();
    const data = UpdateCustomerSchema.parse(body);

    await connectDB();
    const customer = await Customer.findById(id);
    if (!customer) {
      return errorResponse(new Error('Customer not found'), 404);
    }

    requireRecordAccess(customer, session);

    if (data.name !== undefined) customer.name = data.name;
    if (data.phone !== undefined) customer.phone = data.phone;
    if (data.email !== undefined) customer.email = data.email || undefined;
    if (data.address !== undefined) customer.address = data.address;
    if (data.assignedStaffId !== undefined) {
      customer.assignedStaffId = data.assignedStaffId ? (data.assignedStaffId as any) : null;
    }
    if (data.status !== undefined) customer.status = data.status;
    if (data.notes !== undefined) customer.notes = data.notes;

    await customer.save();

    await logAuditEvent({
      action: 'CUSTOMER_UPDATED',
      module: 'Customers',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: customer.storeId,
      details: { customerId: customer._id, fields: Object.keys(data) },
    });

    return successResponse({ customer });
  } catch (error) {
    return errorResponse(error);
  }
}
