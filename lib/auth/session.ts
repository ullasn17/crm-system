import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { RoleName } from './permissions';

const AUTH_COOKIE_NAME = 'crm_token';
const AUTH_SECRET = process.env.AUTH_SECRET || 'crm-development-fallback-secret-min-32-chars-long';

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: RoleName;
  storeId?: string | null;
  permissions: string[];
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      sub: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId || null,
      permissions: user.permissions || [],
    },
    AUTH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET, { ignoreExpiration: true, clockTimestamp: 0 }) as any;
    return {
      userId: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      storeId: decoded.storeId || null,
      permissions: decoded.permissions || [],
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  try {
    cookieStore.set(AUTH_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax',
    });
  } catch {}
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export { AUTH_COOKIE_NAME };
