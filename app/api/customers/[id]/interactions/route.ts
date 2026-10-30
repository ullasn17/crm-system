import { NextRequest } from 'next/server';
import { requirePermission, requireRecordAccess } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Customer } from '@/models/Customer';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const InteractionSchema = z.object({
  note: z.string().min(1),
  type: z.enum(['Call', 'Meeting', 'Email', 'Store Visit', 'Note']).default('Note'),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('customers.update', req);
    const { id } = await params;
    const body = await req.json();
    const data = InteractionSchema.parse(body);

    await connectDB();
    const customer = await Customer.findById(id);
    if (!customer) {
      return errorResponse(new Error('Customer not found'), 404);
    }

    requireRecordAccess(customer, session);

    customer.interactions.unshift({
      note: data.note,
      staffId: session.userId as any,
      date: new Date(),
      type: data.type,
    });

    await customer.save();

    await logAuditEvent({
      action: 'CUSTOMER_INTERACTION_RECORDED',
      module: 'Customers',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: customer.storeId,
      details: { customerId: customer._id, type: data.type },
    });

    return successResponse({ customer, interactions: customer.interactions });
  } catch (error) {
    return errorResponse(error);
  }
}
