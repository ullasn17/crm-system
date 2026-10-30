import { NextRequest } from 'next/server';
import { requireAuth, requireRecordAccess } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Task } from '@/models/Task';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CommentSchema = z.object({
  text: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const data = CommentSchema.parse(body);

    await connectDB();
    const task = await Task.findById(id);
    if (!task) {
      return errorResponse(new Error('Task not found'), 404);
    }

    requireRecordAccess(task, session);

    task.comments.push({
      text: data.text,
      userId: session.userId as any,
      date: new Date(),
    });

    await task.save();

    await logAuditEvent({
      action: 'TASK_COMMENT_ADDED',
      module: 'Tasks',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: task.storeId,
      details: { taskId: task._id },
    });

    return successResponse({ task, comments: task.comments });
  } catch (error) {
    return errorResponse(error);
  }
}
