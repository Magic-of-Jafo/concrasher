import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client'; // Assuming Role enum is available here

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for an admin path
  if (pathname.startsWith('/admin')) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not set. Middleware cannot validate token.');
      // Redirect to login or an error page, or simply deny access
      // For now, redirecting to login as a sensible default
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const token = await getToken({ req: request, secret });

    // Check if user is admin
    // The token structure depends on your session callback in [...nextauth].ts
    // Assuming roles are stored in token.roles as an array of strings or Role enums
    const isUserAdmin = token?.roles?.includes(Role.ADMIN);

    if (!token || !isUserAdmin) {
      // Redirect to login page if not admin or not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname); // Optional: redirect back after login
      console.log(`Redirecting unauthenticated/unauthorized user from ${pathname} to ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ['/admin/:path*'],
}; 