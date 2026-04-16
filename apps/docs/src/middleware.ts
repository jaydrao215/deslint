import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  validateSessionToken,
} from '@/lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*'],
};

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 404 });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token || !(await validateSessionToken(token, secret))) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}
