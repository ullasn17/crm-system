import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/authorization';
import { ZodError } from 'zod';

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: any, status = 500) {
  if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
    throw error;
  }
  console.error('[API Error]:', error);

  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return NextResponse.json(
      { success: false, error: `Validation error: ${issues}` },
      { status: 400 }
    );
  }

  if (error?.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return NextResponse.json(
      { success: false, error: `A record with this ${field} already exists.` },
      { status: 409 }
    );
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}
