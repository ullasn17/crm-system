import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { Store } from '@/models/Store';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Admin', 'Store Manager', 'Staff', 'Counter']),
  storeId: z.string().optional().nullable(),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('users.read', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const storeIdParam = searchParams.get('storeId');

    const filter: Record<string, any> = {};

    // Multi-store isolation: Store Managers only view their own store users
    if (session.role === 'Store Manager') {
      filter.storeId = session.storeId;
    } else if (session.role === 'Admin' && storeIdParam) {
      filter.storeId = storeIdParam;
    }

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('users.create', req);
    const body = await req.json();
    const data = CreateUserSchema.parse(body);

    await connectDB();

    // Security check: Store Manager cannot assign Admin or Store Manager roles
    if (session.role === 'Store Manager') {
      if (data.role === 'Admin' || data.role === 'Store Manager') {
        throw new AuthError('Store Managers can only create Staff or Counter accounts.', 403);
      }
      // Force store to be current Store Manager's store
      data.storeId = session.storeId;
    } else if (session.role !== 'Admin' && data.role === 'Admin') {
      throw new AuthError('Only Administrators can create Admin accounts.', 403);
    }

    // If storeId provided, verify store exists
    if (data.storeId) {
      const storeExists = await Store.findById(data.storeId);
      if (!storeExists) {
        return errorResponse(new Error('Invalid store selected'));
      }
    }

    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      return errorResponse(new Error('A user with this email address already exists.'));
    }

    const passwordHash = await hashPassword(data.password);
    const newUser = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      storeId: data.storeId || null,
      phone: data.phone || '',
      isActive: true,
    });

    await logAuditEvent({
      action: 'USER_CREATED',
      module: 'Users',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: data.storeId,
      details: {
        createdUserId: newUser._id,
        createdUserEmail: newUser.email,
        assignedRole: newUser.role,
      },
    });

    const userObj = newUser.toObject();
    delete (userObj as any).passwordHash;

    return successResponse({ user: userObj }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
