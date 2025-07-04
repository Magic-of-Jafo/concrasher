// Create a mock function for the validator BEFORE any imports
const mockSafeParse = jest.fn();

// Mock validators FIRST
jest.mock('@/lib/validators', () => ({
  ConventionCreateSchema: {
    safeParse: mockSafeParse,
  },
  ConventionCreateInput: {},
}));

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

// Mock Prisma client  
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    convention: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock NextAuth getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Now import after all mocks are set up
import { POST, GET } from './route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { Role } from '@prisma/client';
import { ConventionCreateInput } from '@/lib/validators';
import { Prisma } from '@prisma/client';
import { ConventionStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

// Typed mocks for convenience
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('API /api/conventions', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

    // Setup default successful validation for ConventionCreateSchema
    mockSafeParse.mockReturnValue({
      success: true,
      data: {
        name: 'Test Convention',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-03'),
        city: 'Test City',
        stateAbbreviation: 'TS',
        country: 'Test Country',
        venueName: 'Test Venue',
        description: 'A test convention',
        websiteUrl: 'https://example.com',
        status: 'PUBLISHED',
        bannerImageUrl: 'https://example.com/banner.jpg',
        galleryImageUrls: ['https://example.com/gallery1.jpg'],
      },
    });
  });

  describe('POST /api/conventions', () => {
    const validConventionPayload = {
      name: 'Test Convention',
      startDate: '2025-01-01',
      endDate: '2025-01-03',
      city: 'Test City',
      state: 'TS',
      country: 'Test Country',
      venueName: 'Test Venue',
      description: 'A test convention',
      websiteUrl: 'https://example.com',
      status: ConventionStatus.PUBLISHED,
      bannerImageUrl: 'https://example.com/banner.jpg',
      galleryImageUrls: ['https://example.com/gallery1.jpg'],
    };

    it('should create a convention when user is ADMIN and data is valid', async () => {
      // Override the mock for this specific test
      mockSafeParse.mockReturnValueOnce({
        success: true,
        data: {
          name: 'Test Convention',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-03'),
          city: 'Test City',
          stateAbbreviation: 'TS',
          country: 'Test Country',
          venueName: 'Test Venue',
          description: 'A test convention',
          websiteUrl: 'https://example.com',
          status: 'PUBLISHED',
          bannerImageUrl: 'https://example.com/banner.jpg',
          galleryImageUrls: ['https://example.com/gallery1.jpg'],
        },
      });

      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const expectedSlug = 'test-convention';
      (mockedPrisma.convention.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.convention.create as jest.Mock).mockResolvedValue({
        id: 'newConventionId',
        ...validConventionPayload,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-03'),
        slug: expectedSlug,
        organizerUserId: 'adminUserId',
      });

      const request = new Request('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const responseBody = await response.json();

      if (response.status === 400) {
        console.error('Validation errors:', responseBody.errors);
        console.error('Request payload:', validConventionPayload);
      }

      expect(response.status).toBe(201);
      expect(responseBody.id).toBe('newConventionId');
      expect(responseBody.name).toBe(validConventionPayload.name);
      expect(responseBody.slug).toBe(expectedSlug);
      expect(mockedPrisma.convention.create).toHaveBeenCalled();
    });

    it('should generate a unique slug if initial slug exists', async () => {
      // Override the mock for this specific test
      mockSafeParse.mockReturnValueOnce({
        success: true,
        data: {
          name: 'Test Convention',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-03'),
          city: 'Test City',
          stateAbbreviation: 'TS',
          country: 'Test Country',
          venueName: 'Test Venue',
          description: 'A test convention',
          websiteUrl: 'https://example.com',
          status: 'PUBLISHED',
          bannerImageUrl: 'https://example.com/banner.jpg',
          galleryImageUrls: ['https://example.com/gallery1.jpg'],
        },
      });

      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });

      const initialSlug = 'test-convention';
      (mockedPrisma.convention.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existingConId', slug: initialSlug } as any); // Simulate slug conflict
      // The second call to findUnique for a potentially new generated slug (if the handler did that) should be null
      // For this test, we assume the create will happen with a modified slug passed by the handler.

      const createdConventionData = {
        id: 'newConventionId2',
        organizerUserId: 'adminUserId',
        // slug will be different due to conflict resolution in handler
        ...validConventionPayload,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-03'),
        createdAt: new Date(),
        updatedAt: new Date(),
        conventionSeriesId: null,
      };
      // We need to capture the slug that the handler creates
      (mockedPrisma.convention.create as jest.Mock).mockImplementation(async (args: Prisma.ConventionCreateArgs) => {
        return { ...createdConventionData, slug: args.data.slug! };
      });


      const request = new Request('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.slug).not.toBe(initialSlug); // Slug should have been modified
      expect(responseBody.slug).toMatch(new RegExp(`^${initialSlug}-\\d{5}$`)); // Matches 'test-convention-' followed by 5 digits
      expect(mockedPrisma.convention.create).toHaveBeenCalled();
      expect(mockedPrisma.convention.findUnique).toHaveBeenCalledWith({ where: { slug: initialSlug } });
    });

    it('should return 403 Forbidden if user is not ADMIN or ORGANIZER', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'nonAdminUserId', roles: [Role.USER] },
        expires: 'never',
      });

      const request = new Request('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden - Must be an admin or organizer');
      expect(mockedPrisma.convention.create).not.toHaveBeenCalled();
    });

    it('should return 401 Unauthorized if user is unauthenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody.message).toBe('Unauthorized');
      expect(mockedPrisma.convention.create).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request for invalid data (e.g., missing name)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });

      // Mock validation failure for this specific test
      mockSafeParse.mockReturnValueOnce({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: {
              name: ['Name is required'],
            },
          }),
        },
      });

      const { name, ...invalidPayload } = validConventionPayload; // 'name' is removed

      const request = new Request('http://localhost/api/conventions', {
        method: 'POST',
        // @ts-ignore to test invalid payload shape
        body: JSON.stringify(invalidPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.errors).toHaveProperty('name');
      expect(mockedPrisma.convention.create).not.toHaveBeenCalled();
    });

    // TODO: Add test for Prisma P2002 error (unique constraint violation) if not covered by slug generation
  });

  describe('GET /api/conventions', () => {
    it('should return paginated conventions data (public endpoint)', async () => {
      const testDate = new Date('2025-07-04T04:26:37.785Z');
      const mockConventions = [
        { id: 'con1', name: 'Convention Alpha', slug: 'convention-alpha', status: 'PUBLISHED', organizerUserId: 'user1', startDate: testDate, endDate: testDate, city: 'CityA', state: 'ST', country: 'CountryA', galleryImageUrls: [], createdAt: testDate, updatedAt: testDate, conventionSeriesId: null, bannerImageUrl: null, description: null, venueName: null, websiteUrl: null },
        { id: 'con2', name: 'Convention Beta', slug: 'convention-beta', status: 'PUBLISHED', organizerUserId: 'user2', startDate: testDate, endDate: testDate, city: 'CityB', state: 'ST', country: 'CountryB', galleryImageUrls: [], createdAt: testDate, updatedAt: testDate, conventionSeriesId: null, bannerImageUrl: null, description: null, venueName: null, websiteUrl: null },
      ];
      (mockedPrisma.convention.findMany as jest.Mock).mockResolvedValue(mockConventions);
      (mockedPrisma.convention.count as jest.Mock).mockResolvedValue(2);

      // Create a proper NextRequest mock with nextUrl and searchParams
      const request = {
        method: 'GET',
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as NextRequest;

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);

      // Dates are serialized to strings in JSON response, so we need to match that
      const expectedConventions = mockConventions.map(conv => ({
        ...conv,
        startDate: testDate.toISOString(),
        endDate: testDate.toISOString(),
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString(),
      }));

      expect(responseBody).toEqual({
        items: expectedConventions,
        total: 2,
        page: 1,
        totalPages: 1,
      });
      expect(mockedPrisma.convention.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: ConventionStatus.PUBLISHED,
          deletedAt: null,
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(mockedPrisma.convention.count).toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      (mockedPrisma.convention.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Create a proper NextRequest mock with nextUrl and searchParams
      const request = {
        method: 'GET',
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as NextRequest;

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to fetch conventions');
    });
  });
}); 