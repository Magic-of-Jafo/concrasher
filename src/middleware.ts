import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequestWithAuth } from 'next-auth/middleware';

export default async function middleware(request: NextRequestWithAuth) {
  const token = await getToken({ req: request });
  const isAuth = !!token;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL('/organizer/conventions', request.url));
    }
    return null;
  }

  if (!isAuth) {
    let from = request.nextUrl.pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, request.url)
    );
  }

  // Role-based access control
  const userRoles = token.roles as string[] || [];
  const isOrganizer = userRoles.includes('ORGANIZER');
  const isAdmin = userRoles.includes('ADMIN');

  // Protect convention management routes - now only /organizer/conventions and its subpaths
  if (request.nextUrl.pathname.startsWith('/organizer/conventions')) {
    if (!isOrganizer && !isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // '/conventions/manage/:path*', // Removed old path
    '/organizer/conventions/:path*',
    '/login',
  ],
}; 