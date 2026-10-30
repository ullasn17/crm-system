import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['Admin', 'Store Manager', 'Staff', 'Counter']).optional(),
  storeId: z.string().optional().nullable(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('users.read', req);
    const { id } = await params;

    await connectDB();
    const user = await User.findById(id).populate('storeId', 'name code').lean();
    if (!user) {
      return errorResponse(new Error('User not found'), 404);
    }

    // Store Managers can only view users in their store
    if (session.role === 'Store Manager' && user.storeId?._id?.toString() !== session.storeId) {
      throw new AuthError('Access denied. You cannot view users outside your store.', 403);
    }

    return successResponse({ user });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('users.update', req);
    const { id } = await params;
    const body = await req.json();
    const data = UpdateUserSchema.parse(body);

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return errorResponse(new Error('User not found'), 404);
    }

    // Store Manager restrictions
    if (session.role === 'Store Manager') {
      if (targetUser.storeId?.toString() !== session.storeId) {
        throw new AuthError('Access denied. You can only edit users in your assigned store.', 403);
      }
      if (data.role && (data.role === 'Admin' || data.role === 'Store Manager')) {
        throw new AuthError('Store Managers cannot assign Admin or Store Manager roles.', 403);
      }
      if (data.storeId && data.storeId !== session.storeId) {
        throw new AuthError('Store Managers cannot transfer users to other stores.', 403);
      }
    }

    // Safety: Prevent deactivating the last active Admin
    if (data.isActive === false && targetUser.role === 'Admin') {
      const activeAdminCount = await User.countDocuments({ role: 'Admin', isActive: true, _id: { $ne: targetUser._id } });
      if (activeAdminCount === 0) {
        return errorResponse(new Error('Security violation: Cannot deactivate the last remaining active Administrator.'));
      }
    }

    // Apply updates
    if (data.name !== undefined) targetUser.name = data.name;
    if (data.email !== undefined) targetUser.email = data.email.toLowerCase();
    if (data.phone !== undefined) targetUser.phone = data.phone;
    if (data.isActive !== undefined) targetUser.isActive = data.isActive;
    if (data.role !== undefined && session.role === 'Admin') targetUser.role = data.role;
    if (data.storeId !== undefined && session.role === 'Admin') {
      targetUser.storeId = data.storeId ? (data.storeId as any) : null;
    }
    if (data.password) {
      targetUser.passwordHash = await hashPassword(data.password);
    }

    await targetUser.save();

    await logAuditEvent({
      action: 'USER_UPDATED',
      module: 'Users',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetUser.storeId,
      details: {
        updatedUserId: targetUser._id,
        updatedFields: Object.keys(data),
      },
    });

    const userObj = targetUser.toObject();
    delete (userObj as any).passwordHash;

    return successResponse({ user: userObj });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('users.deactivate', req);
    const { id } = await params;

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return errorResponse(new Error('User not found'), 404);
    }

    if (session.role === 'Store Manager' && targetUser.storeId?.toString() !== session.storeId) {
      throw new AuthError('Access denied. You can only deactivate users in your store.', 403);
    }

    if (targetUser.role === 'Admin') {
      const activeAdminCount = await User.countDocuments({ role: 'Admin', isActive: true, _id: { $ne: targetUser._id } });
      if (activeAdminCount === 0) {
        return errorResponse(new Error('Security violation: Cannot deactivate the last remaining active Administrator.'));
      }
    }

    targetUser.isActive = false;
    await targetUser.save();

    await logAuditEvent({
      action: 'USER_DEACTIVATED',
      module: 'Users',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetUser.storeId,
      details: { deactivatedUserId: targetUser._id, email: targetUser.email },
    });

    return successResponse({ message: 'User account has been deactivated.' });
  } catch (error) {
    return errorResponse(error);
  }
}
