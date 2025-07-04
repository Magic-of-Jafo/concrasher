import { POST } from './route'; // Adjust path as necessary
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: jest.fn((data, init) => {
      const response = new Response(JSON.stringify(data), {
        status: init?.status || 200,
        statusText: init?.statusText || 'OK',
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
      return response;
    }),
  },
}));

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Role: { USER: 'USER', ORGANIZER: 'ORGANIZER', TALENT: 'TALENT', ADMIN: 'ADMIN' }, // Mock Role enum
  };
});

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

// Mock NextRequest
const mockRequest = (body: any): NextRequest => {
  return {
    json: jest.fn().mockResolvedValue(body),
    // Add other properties/methods if your route uses them, e.g., headers
    headers: new Headers(),
  } as unknown as NextRequest;
};

// Helper to get response body
async function getResponseBody(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text; // In case it's not JSON, like a plain text error
  }
}

describe('POST /api/auth/register', () => {
  let prismaMock: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    const PrismaClientMock = require('@prisma/client').PrismaClient;
    prismaMock = new PrismaClientMock();
  });

  it('should register a new user successfully', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const req = mockRequest(requestBody);

    prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword123');
    const mockNewUser = {
      id: '1',
      email: 'test@example.com',
      hashedPassword: 'hashedpassword123',
      roles: [Role.USER],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.user.create.mockResolvedValue(mockNewUser);

    const response = await POST(req);
    const responseBody = await getResponseBody(response);

    expect(response.status).toBe(201);
    expect(responseBody.message).toBe('User registered successfully');
    expect(responseBody.user.email).toBe('test@example.com');
    expect(responseBody.user.hashedPassword).toBeUndefined(); // Ensure password is not returned
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        hashedPassword: 'hashedpassword123',
        roles: [Role.USER],
      },
    });
  });

  it('should return 400 for invalid input data', async () => {
    const requestBody = {
      email: 'invalid-email', // Invalid email
      password: 'short',
      confirmPassword: 'short',
    };
    const req = mockRequest(requestBody);

    const response = await POST(req);
    const responseBody = await getResponseBody(response);

    expect(response.status).toBe(400);
    expect(responseBody.errors).toBeDefined();
    expect(responseBody.errors.email).toContain('Invalid email address');
    expect(responseBody.errors.password).toContain('Password must be at least 8 characters long');
  });

  it('should return 409 if email already exists', async () => {
    const requestBody = {
      email: 'existing@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const req = mockRequest(requestBody);

    prismaMock.user.findUnique.mockResolvedValue({ id: '2', email: 'existing@example.com' }); // User exists

    const response = await POST(req);
    const responseBody = await getResponseBody(response);

    expect(response.status).toBe(409);
    expect(responseBody.message).toBe('Email already exists');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('should return 400 if passwords do not match', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456', // Mismatched password
    };
    const req = mockRequest(requestBody);

    const response = await POST(req);
    const responseBody = await getResponseBody(response);

    expect(response.status).toBe(400);
    expect(responseBody.errors).toBeDefined();
    // The error from refine is not directly in fieldErrors like individual Zod checks,
    // it would be in a general error or under the path specified in refine.
    // For this specific RegistrationSchema, the path is ["confirmPassword"].
    expect(responseBody.errors.confirmPassword).toContain("Passwords don't match");
  });

  it('should return 500 for unexpected errors during registration', async () => {
    const requestBody = {
      email: 'error@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const req = mockRequest(requestBody);

    prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed')); // Simulate DB error

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    const response = await POST(req);
    const responseBody = await getResponseBody(response);

    expect(response.status).toBe(500);
    expect(responseBody.message).toBe('Internal server error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
}); 