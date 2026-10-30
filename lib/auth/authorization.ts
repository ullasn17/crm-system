import { getSession, verifyToken, SessionUser } from './session';
import { RoleName, PermissionKey, ROLE_DEFAULT_PERMISSIONS } from './permissions';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import { Role } from '@/models/Role';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Extracts session user from either request headers (Authorization: Bearer) or cookies.
 */
export async function getCurrentUser(request?: Request): Promise<SessionUser | null> {
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const user = verifyToken(token);
      if (user) return user;
    }
  }

  return getSession();
}

/**
 * Asserts user is authenticated and active in the database.
 */
export async function requireAuth(request?: Request): Promise<SessionUser> {
  const session = await getCurrentUser(request);
  if (!session) {
    throw new AuthError('Authentication required. Please sign in.', 401);
  }

  await connectDB();
  const dbUser = await User.findById(session.userId).lean();
  if (!dbUser || !dbUser.isActive) {
    throw new AuthError('Account is inactive or does not exist.', 403);
  }

  return session;
}

/**
 * Asserts user has one of the allowed roles.
 */
export async function requireRole(allowedRoles: RoleName[], request?: Request): Promise<SessionUser> {
  const user = await requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(`Forbidden. Requires one of roles: ${allowedRoles.join(', ')}`, 403);
  }
  return user;
}

/**
 * Asserts user has a specific permission key (via role or custom overrides).
 */
export async function requirePermission(permission: PermissionKey, request?: Request): Promise<SessionUser> {
  const user = await requireAuth(request);

  if (user.role === 'Admin') {
    return user;
  }

  // Check user session permissions
  if (user.permissions && user.permissions.includes(permission)) {
    return user;
  }

  // Fallback: check dynamic role permissions in DB
  await connectDB();
  const roleDoc = await Role.findOne({ name: user.role }).lean();
  const rolePermissions = roleDoc?.permissions || ROLE_DEFAULT_PERMISSIONS[user.role] || [];

  if (rolePermissions.includes(permission)) {
    return user;
  }

  throw new AuthError(`Forbidden. Missing required permission: ${permission}`, 403);
}

/**
 * Validates store access: Admin has access to all stores.
 * Other roles must match the storeId assigned to their account.
 */
export async function requireStoreAccess(targetStoreId: string | undefined | null, request?: Request): Promise<SessionUser> {
  const user = await requireAuth(request);

  if (user.role === 'Admin') {
    return user;
  }

  if (!user.storeId) {
    throw new AuthError('User is not assigned to any store.', 403);
  }

  if (targetStoreId && targetStoreId.toString() !== user.storeId.toString()) {
    throw new AuthError('Access denied: You do not have permission to access records for this store.', 403);
  }

  return user;
}

/**
 * Generates database query scope based on user role and store assignment.
 */
export function getStoreQueryFilter(user: SessionUser, customStoreId?: string | null): Record<string, any> {
  if (user.role === 'Admin') {
    return customStoreId ? { storeId: customStoreId } : {};
  }
  return { storeId: user.storeId };
}

/**
 * Asserts ownership/assignment for Staff or Counter where appropriate.
 */
export function requireRecordAccess(
  record: { storeId?: any; assignedStaffId?: any; assignedTo?: any; createdBy?: any; cashierId?: any },
  user: SessionUser
): void {
  if (user.role === 'Admin') {
    return;
  }

  if (record.storeId && record.storeId.toString() !== user.storeId?.toString()) {
    throw new AuthError('Forbidden. Record belongs to another store.', 403);
  }

  if (user.role === 'Staff') {
    const isOwner =
      (record.assignedStaffId && record.assignedStaffId.toString() === user.userId) ||
      (record.assignedTo && record.assignedTo.toString() === user.userId) ||
      (record.createdBy && record.createdBy.toString() === user.userId);

    // If record has an explicit owner/assignee and user is not owner, block
    if (record.assignedStaffId || record.assignedTo) {
      if (!isOwner) {
        throw new AuthError('Forbidden. Record is assigned to another staff member.', 403);
      }
    }
  }
}
