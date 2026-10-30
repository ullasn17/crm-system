import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { logAuditEvent, createNotification } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  dueDate: z.string(),
  assignedTo: z.string().min(1, 'Please select an assignee'),
  storeId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const storeIdParam = searchParams.get('storeId');

    const filter: Record<string, any> = {};

    // Role-based scoping: Staff sees only their assigned tasks
    if (session.role === 'Staff' || session.role === 'Counter') {
      filter.assignedTo = session.userId;
      filter.storeId = session.storeId;
    } else if (session.role === 'Store Manager') {
      filter.storeId = session.storeId;
      if (assignedTo) filter.assignedTo = assignedTo;
    } else if (session.role === 'Admin') {
      if (storeIdParam) filter.storeId = storeIdParam;
      if (assignedTo) filter.assignedTo = assignedTo;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('storeId', 'name code')
      .sort({ dueDate: 1, priority: -1 })
      .lean();

    return successResponse({ tasks });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    // Only Admin or Store Manager can assign tasks
    if (session.role !== 'Admin' && session.role !== 'Store Manager') {
      throw new AuthError('Only Store Managers and Administrators can assign tasks.', 403);
    }

    const body = await req.json();
    const data = CreateTaskSchema.parse(body);

    await connectDB();

    let targetStoreId = data.storeId || undefined;
    if (session.role === 'Store Manager') {
      targetStoreId = session.storeId || undefined;
    }

    // Verify assigned employee belongs to target store (or is valid user)
    const assignee = await User.findById(data.assignedTo);
    if (!assignee) {
      return errorResponse(new Error('Assigned employee does not exist.'));
    }

    if (!targetStoreId && assignee.storeId) {
      targetStoreId = assignee.storeId.toString();
    }

    if (!targetStoreId) {
      return errorResponse(new Error('Store assignment is required for task creation. Please select a store or assign to a user with an assigned store.'));
    }

    if (session.role === 'Store Manager' && assignee.storeId?.toString() !== session.storeId) {
      throw new AuthError('Cannot assign tasks to employees outside your store.', 403);
    }

    const task = await Task.create({
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      status: 'Pending',
      dueDate: new Date(data.dueDate),
      storeId: targetStoreId,
      assignedTo: data.assignedTo,
      createdBy: session.userId,
      comments: [],
    });

    await createNotification({
      recipientId: data.assignedTo,
      storeId: targetStoreId,
      title: 'New Task Assigned',
      message: `You have been assigned: ${task.title} (Priority: ${task.priority})`,
      type: 'task_assigned',
      link: '/tasks',
    });

    await logAuditEvent({
      action: 'TASK_CREATED',
      module: 'Tasks',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetStoreId,
      details: { taskId: task._id, title: task.title, assignedTo: data.assignedTo },
    });

    return successResponse({ task }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
