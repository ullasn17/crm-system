import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('crm_token')?.value;
  const { pathname } = request.nextUrl;

  // Public and authentication pages
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  const isPublicAsset =
    pathname.startsWith('/branches') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // If already logged in and visiting login/auth pages, redirect to dashboard
  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // If trying to access root `/`, redirect to `/login` if not authenticated, or `/dashboard` if authenticated
  if (pathname === '/') {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // All dashboard routes require authentication
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, svg files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
