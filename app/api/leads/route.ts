import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Lead } from '@/models/Lead';
import { logAuditEvent, createNotification } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  storeId: z.string().optional().nullable(),
  assignedStaffId: z.string().optional().nullable(),
  source: z.enum(['Walk-in', 'Website', 'Referral', 'Social Media', 'Cold Call', 'Other']).default('Walk-in'),
  interest: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost']).default('New'),
  estimatedValue: z.number().min(0).optional(),
  followUpDate: z.string().optional().nullable(),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('leads.manage', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const overdueOnly = searchParams.get('overdue') === 'true';
    const staffId = searchParams.get('staffId');
    const storeIdParam = searchParams.get('storeId');

    const filter: Record<string, any> = {};

    // Multi-store isolation
    if (session.role !== 'Admin') {
      filter.storeId = session.storeId;
      // If Staff user, only see leads assigned to them or unassigned
      if (session.role === 'Staff') {
        filter.$or = [{ assignedStaffId: session.userId }, { assignedStaffId: null }];
      }
    } else if (storeIdParam) {
      filter.storeId = storeIdParam;
    }

    if (staffId && session.role !== 'Staff') {
      filter.assignedStaffId = staffId;
    }

    if (status) {
      filter.status = status;
    }

    if (source) {
      filter.source = source;
    }

    if (overdueOnly) {
      filter.followUpDate = { $lt: new Date() };
      filter.status = { $nin: ['Converted', 'Lost'] };
    }

    if (search) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { interest: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const leads = await Lead.find(filter)
      .populate('storeId', 'name code')
      .populate('assignedStaffId', 'name email')
      .populate('convertedCustomerId', 'name phone')
      .sort({ followUpDate: 1, createdAt: -1 })
      .lean();

    return successResponse({ leads });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('leads.manage', req);
    const body = await req.json();
    const data = CreateLeadSchema.parse(body);

    await connectDB();

    let targetStoreId = data.storeId;
    if (session.role !== 'Admin') {
      targetStoreId = session.storeId || undefined;
    }

    if (!targetStoreId) {
      return errorResponse(new Error('Store assignment is required for leads.'));
    }

    const notes = data.note
      ? [{ text: data.note, staffId: session.userId as any, date: new Date() }]
      : [];

    const assignedStaff = data.assignedStaffId || (session.role === 'Staff' ? session.userId : null);

    const lead = await Lead.create({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      storeId: targetStoreId,
      assignedStaffId: assignedStaff,
      source: data.source,
      interest: data.interest || '',
      status: data.status,
      estimatedValue: data.estimatedValue || 0,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      notes,
      createdBy: session.userId,
    });

    if (assignedStaff && assignedStaff !== session.userId) {
      await createNotification({
        recipientId: assignedStaff,
        storeId: targetStoreId,
        title: 'New Lead Assigned',
        message: `You have been assigned lead: ${lead.name}`,
        type: 'lead_followup',
        link: '/leads',
      });
    }

    await logAuditEvent({
      action: 'LEAD_CREATED',
      module: 'Leads',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetStoreId,
      details: { leadId: lead._id, leadName: lead.name, status: lead.status },
    });

    return successResponse({ lead }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
