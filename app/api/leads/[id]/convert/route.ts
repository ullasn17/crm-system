import { NextRequest } from 'next/server';
import { requirePermission, requireRecordAccess } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Lead } from '@/models/Lead';
import { Customer } from '@/models/Customer';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('leads.manage', req);
    const { id } = await params;

    await connectDB();
    const lead = await Lead.findById(id);
    if (!lead) {
      return errorResponse(new Error('Lead not found'), 404);
    }

    requireRecordAccess(lead, session);

    if (lead.status === 'Converted' && lead.convertedCustomerId) {
      return errorResponse(new Error('This lead has already been converted into a customer.'));
    }

    // Check if customer already exists by phone in the same store
    let customer = await Customer.findOne({ storeId: lead.storeId, phone: lead.phone });

    if (!customer) {
      customer = await Customer.create({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        storeId: lead.storeId,
        assignedStaffId: lead.assignedStaffId || session.userId,
        status: 'Active',
        notes: `Converted from lead (${lead.source}). Interest: ${lead.interest || 'N/A'}`,
        createdBy: session.userId,
        interactions: [
          {
            note: `Lead successfully converted to customer. Initial interest: ${lead.interest || 'General'}`,
            staffId: session.userId as any,
            date: new Date(),
            type: 'Note',
          },
        ],
      });
    }

    lead.status = 'Converted';
    lead.convertedCustomerId = customer._id;
    lead.notes.unshift({
      text: `Lead converted to customer account (Customer ID: ${customer._id})`,
      staffId: session.userId as any,
      date: new Date(),
    });
    await lead.save();

    await logAuditEvent({
      action: 'LEAD_CONVERTED_TO_CUSTOMER',
      module: 'Leads',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: lead.storeId,
      details: { leadId: lead._id, customerId: customer._id, customerName: customer.name },
    });

    return successResponse({
      message: 'Lead successfully converted to customer',
      customer,
      lead,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
