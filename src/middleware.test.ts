import middleware from './middleware';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequestWithAuth } from 'next-auth/middleware';
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


// Mock NextResponse at top level
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    ...jest.requireActual('next/server').NextResponse,
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url) => ({
      status: 307,
      url: url.toString(),
      headers: { location: url.toString() }
    })),
  },
}));

describe('Organizer Middleware', () => {

  it('should allow access for admin users to /organizer/conventions', async () => {
    mockedGetToken.mockResolvedValueOnce({ roles: [Role.ADMIN], sub: 'admin-user-id' });
    const request = new NextRequest(new URL('http://localhost/organizer/conventions')) as NextRequestWithAuth;
    const response = await middleware(request, {} as any);
    expect(response).toBeTruthy();
  });

  it('should redirect non-organizer users from /organizer/conventions to /unauthorized', async () => {
    mockedGetToken.mockResolvedValueOnce({ roles: [Role.USER], sub: 'user-id' });
    const request = new NextRequest(new URL('http://localhost/organizer/conventions')) as NextRequestWithAuth;
    const response = await middleware(request, {} as any);
    expect(response?.url).toContain('/unauthorized');
  });

  it('should redirect unauthenticated users from /organizer/conventions to /login', async () => {
    mockedGetToken.mockResolvedValueOnce(null);
    const request = new NextRequest(new URL('http://localhost/organizer/conventions')) as NextRequestWithAuth;
    const response = await middleware(request, {} as any);
    expect(response?.url).toContain('/login?from=');
  });

  it('should redirect if NEXTAUTH_SECRET is not set', async () => {
    delete process.env.NEXTAUTH_SECRET; // Simulate missing secret
    mockedGetToken.mockResolvedValueOnce(null); // getToken will fail without secret
    const request = new NextRequest(new URL('http://localhost/organizer/conventions')) as NextRequestWithAuth;
    const response = await middleware(request, {} as any);
    expect(response?.url).toContain('/login?from=');
  });

  it('should allow access to non-protected routes', async () => {
    const request = new NextRequest(new URL('http://localhost/some/other/page')) as NextRequestWithAuth;
    const response = await middleware(request, {} as any);
    // This route is not in the matcher config, so middleware should pass through
    expect(response).toBeTruthy();
  });
}); 