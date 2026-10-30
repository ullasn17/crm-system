import { NextRequest } from 'next/server';
import { requireAuth, requireRecordAccess, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Task } from '@/models/Task';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const UpdateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    await connectDB();
    const task = await Task.findById(id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('storeId', 'name code')
      .populate('comments.userId', 'name email')
      .lean();

    if (!task) {
      return errorResponse(new Error('Task not found'), 404);
    }

    requireRecordAccess(task, session);

    return successResponse({ task });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const data = UpdateTaskSchema.parse(body);

    await connectDB();
    const task = await Task.findById(id);
    if (!task) {
      return errorResponse(new Error('Task not found'), 404);
    }

    requireRecordAccess(task, session);

    // If Staff user, they can only update status
    if (session.role === 'Staff' || session.role === 'Counter') {
      if (data.title || data.description || data.priority || data.dueDate || data.assignedTo) {
        throw new AuthError('Staff can only update task progress status.', 403);
      }
    }

    if (data.status !== undefined) {
      task.status = data.status;
      if (data.status === 'Completed') {
        task.completedAt = new Date();
      } else {
        task.completedAt = undefined;
      }
    }

    if (session.role === 'Admin' || session.role === 'Store Manager') {
      if (data.title !== undefined) task.title = data.title;
      if (data.description !== undefined) task.description = data.description;
      if (data.priority !== undefined) task.priority = data.priority;
      if (data.dueDate !== undefined) task.dueDate = new Date(data.dueDate);
      if (data.assignedTo !== undefined) task.assignedTo = data.assignedTo as any;
    }

    await task.save();

    await logAuditEvent({
      action: 'TASK_UPDATED',
      module: 'Tasks',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: task.storeId,
      details: { taskId: task._id, updatedFields: Object.keys(data), newStatus: task.status },
    });

    return successResponse({ task });
  } catch (error) {
    return errorResponse(error);
  }
}
