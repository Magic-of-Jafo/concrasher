import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    console.error('NEXTAUTH_SECRET is not set. Middleware cannot validate token.');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const token = await getToken({ req: request, secret });
  console.log('Middleware - Token:', token); // Debug log

  // If no token, redirect to login
  if (!token) {
    console.log('Middleware - No token found, redirecting to login'); // Debug log
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user is admin - if yes, allow access to everything
  const isUserAdmin = token?.roles?.includes(Role.ADMIN);
  console.log('Middleware - Is user admin?', isUserAdmin); // Debug log
  console.log('Middleware - User roles:', token?.roles); // Debug log

  if (isUserAdmin) {
    console.log('Middleware - Admin access granted to:', pathname); // Debug log
    return NextResponse.next();
  }

  // For non-admin users, check specific route permissions
  if (pathname.startsWith('/admin')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    console.log(`Redirecting non-admin user from ${pathname} to ${loginUrl.toString()}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/conventions/new')) {
    const isUserOrganizer = token?.roles?.includes(Role.ORGANIZER);
    if (!isUserOrganizer) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      console.log(`Redirecting non-organizer user from ${pathname} to ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ['/admin/:path*', '/conventions/new'],
}; 