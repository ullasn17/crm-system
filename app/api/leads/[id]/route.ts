import { NextRequest } from 'next/server';
import { requirePermission, requireRecordAccess, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Lead } from '@/models/Lead';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const UpdateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional().or(z.literal('')),
  assignedStaffId: z.string().optional().nullable(),
  source: z.enum(['Walk-in', 'Website', 'Referral', 'Social Media', 'Cold Call', 'Other']).optional(),
  interest: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost']).optional(),
  estimatedValue: z.number().min(0).optional(),
  followUpDate: z.string().optional().nullable(),
  newNote: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('leads.manage', req);
    const { id } = await params;

    await connectDB();
    const lead = await Lead.findById(id)
      .populate('storeId', 'name code')
      .populate('assignedStaffId', 'name email')
      .populate('notes.staffId', 'name email')
      .lean();

    if (!lead) {
      return errorResponse(new Error('Lead not found'), 404);
    }

    requireRecordAccess(lead, session);

    return successResponse({ lead });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('leads.manage', req);
    const { id } = await params;
    const body = await req.json();
    const data = UpdateLeadSchema.parse(body);

    await connectDB();
    const lead = await Lead.findById(id);
    if (!lead) {
      return errorResponse(new Error('Lead not found'), 404);
    }

    requireRecordAccess(lead, session);

    if (data.name !== undefined) lead.name = data.name;
    if (data.phone !== undefined) lead.phone = data.phone;
    if (data.email !== undefined) lead.email = data.email || undefined;
    if (data.source !== undefined) lead.source = data.source;
    if (data.interest !== undefined) lead.interest = data.interest;
    if (data.status !== undefined) lead.status = data.status;
    if (data.estimatedValue !== undefined) lead.estimatedValue = data.estimatedValue;
    if (data.followUpDate !== undefined) {
      lead.followUpDate = data.followUpDate ? new Date(data.followUpDate) : undefined;
    }

    if (data.assignedStaffId !== undefined) {
      // Only Admin or Store Manager can reassign leads to someone else
      if (session.role === 'Staff' && data.assignedStaffId !== session.userId) {
        throw new AuthError('Staff members cannot reassign leads to other employees.', 403);
      }
      lead.assignedStaffId = data.assignedStaffId ? (data.assignedStaffId as any) : null;
    }

    if (data.newNote) {
      lead.notes.unshift({
        text: data.newNote,
        staffId: session.userId as any,
        date: new Date(),
      });
    }

    await lead.save();

    await logAuditEvent({
      action: 'LEAD_UPDATED',
      module: 'Leads',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: lead.storeId,
      details: { leadId: lead._id, updatedFields: Object.keys(data) },
    });

    return successResponse({ lead });
  } catch (error) {
    return errorResponse(error);
  }
}
