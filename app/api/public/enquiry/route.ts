import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { Store } from '@/models/Store';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { logAuditEvent, createNotification } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const PublicEnquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  storeId: z.string().min(1, 'Please select a store branch for your enquiry'),
  interest: z.string().min(2, 'Please specify your product interest or inquiry topic'),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = PublicEnquirySchema.parse(body);

    await connectDB();

    // 1. Verify store exists and is active
    const store = await Store.findById(data.storeId);
    if (!store || !store.isActive) {
      return errorResponse(new Error('Selected store branch is unavailable or invalid.'), 400);
    }

    // 2. Resolve creator / system attribution
    const adminUser = await User.findOne({ role: 'Admin', isActive: true });
    const managerUser = await User.findOne({ storeId: store._id, role: 'Store Manager', isActive: true });
    const systemAttributionId = adminUser?._id || managerUser?._id || undefined;

    // 3. Prepare initial note
    const notes = [
      {
        text: `Website Showroom Inquiry: ${data.interest}${data.note ? `\nVisitor Note: ${data.note}` : ''}`,
        staffId: systemAttributionId,
        date: new Date(),
      },
    ];

    // 4. Create lead in CRM pipeline
    const lead: any = await Lead.create({
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email ? data.email.trim().toLowerCase() : undefined,
      storeId: store._id,
      source: 'Website',
      status: 'New',
      interest: data.interest.trim(),
      estimatedValue: 0,
      notes,
      createdBy: systemAttributionId,
    });

    // 4. Create in-app notification for Store Manager of this branch
    await createNotification({
      storeId: store._id,
      roleTarget: 'Store Manager',
      title: `New Website Lead for ${store.name}`,
      message: `${data.name} submitted an enquiry for: "${data.interest}". Phone: ${data.phone}`,
      type: 'lead_followup',
      link: '/leads',
    });

    // 5. Create in-app notification for System Administrators
    await createNotification({
      roleTarget: 'Admin',
      title: `New Website Lead: ${data.name} (${store.code})`,
      message: `Prospective customer enquiry for ${store.name}. Product interest: ${data.interest}`,
      type: 'lead_followup',
      link: '/leads',
    });

    // 6. Record audit log
    await logAuditEvent({
      action: 'PUBLIC_LEAD_ENQUIRY',
      module: 'Leads',
      storeId: store._id,
      details: {
        leadId: lead._id,
        prospectName: data.name,
        prospectPhone: data.phone,
        interest: data.interest,
        storeName: store.name,
        storeCode: store.code,
      },
    });

    return successResponse(
      {
        leadId: lead._id,
        storeName: store.name,
        message: `Thank you, ${data.name}! Your enquiry has been received at our ${store.name} branch. Our team will contact you shortly.`,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
