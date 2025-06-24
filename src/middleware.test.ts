import { middleware } from './middleware';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';

// Mock next-auth/jwt
jest.mock('next-auth/jwt');
const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

// Mock process.env.NEXTAUTH_SECRET
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules(); // Clears the cache
  process.env = { ...originalEnv, NEXTAUTH_SECRET: 'test-secret' };
});

afterEach(() => {
  process.env = originalEnv; // Restore original env
});


describe('Admin Middleware', () => {
  const mockRedirect = jest.fn((url) => ({
    status: 307, // Or whatever status code NextResponse.redirect uses
    headers: { location: url.toString() },
  }));
  
  // Mock NextResponse
  jest.mock('next/server', () => ({
    ...jest.requireActual('next/server'), // import and retain default behavior
    NextResponse: {
      ...jest.requireActual('next/server').NextResponse,
      next: jest.fn(() => ({ type: 'next' })),
      redirect: jest.fn((url) => mockRedirect(url)), 
    },
  }));

  it('should allow access for admin users to /admin/dashboard', async () => {
    mockedGetToken.mockResolvedValueOnce({ roles: [Role.ADMIN], sub: 'admin-user-id' });
    const request = new NextRequest(new URL('http://localhost/admin/dashboard'));
    const response = await middleware(request);
    expect(response?.type).toBe('next');
  });

  it('should redirect non-admin users from /admin/dashboard to /login', async () => {
    mockedGetToken.mockResolvedValueOnce({ roles: [Role.USER], sub: 'user-id' });
    const request = new NextRequest(new URL('http://localhost/admin/dashboard'));
    await middleware(request);
    expect(mockRedirect).toHaveBeenCalledWith(new URL('/login?callbackUrl=%2Fadmin%2Fdashboard', 'http://localhost'));
  });

  it('should redirect unauthenticated users from /admin/dashboard to /login', async () => {
    mockedGetToken.mockResolvedValueOnce(null);
    const request = new NextRequest(new URL('http://localhost/admin/dashboard'));
    await middleware(request);
    expect(mockRedirect).toHaveBeenCalledWith(new URL('/login?callbackUrl=%2Fadmin%2Fdashboard', 'http://localhost'));
  });

  it('should redirect if NEXTAUTH_SECRET is not set', async () => {
    delete process.env.NEXTAUTH_SECRET; // Simulate missing secret
    // Re-import middleware or ensure it reads env at runtime if not already
    // For simplicity, assume middleware reads it on each call
    const request = new NextRequest(new URL('http://localhost/admin/dashboard'));
    await middleware(request);
    expect(mockRedirect).toHaveBeenCalledWith(new URL('/login', 'http://localhost'));
  });

  it('should not interfere with non-admin routes', async () => {
    const request = new NextRequest(new URL('http://localhost/some/other/page'));
    const response = await middleware(request);
    // Check that NextResponse.next() was called, or that no redirect happened
    // The current middleware structure with a specific matcher might mean this test case
    // isn't strictly necessary as the middleware might not even run for this path.
    // However, if the matcher logic changes, this test ensures graceful handling.
    // For now, based on the if (pathname.startsWith('/admin')) in middleware, it will call NextResponse.next()
    expect(response?.type).toBe('next'); 
  });
}); 