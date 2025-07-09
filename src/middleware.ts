import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // If the user is trying to access an admin route
    if (pathname.startsWith('/admin')) {
      // And they are not an admin
      const hasAdminRole = (token?.roles as string[])?.includes('ADMIN');

      if (!hasAdminRole) {
        // Redirect them to the unauthorized page
        const url = req.nextUrl.clone();
        url.pathname = '/unauthorized';
        return NextResponse.redirect(url);
      }
    }

    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/organizer/:path*'], // Protect admin and organizer routes
}; 