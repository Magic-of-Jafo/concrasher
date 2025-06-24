import { POST, GET } from './route';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { Role } from '@prisma/client';
import { ConventionCreateInput } from '@/lib/validators';
import { Prisma } from '@prisma/client';
import { ConventionStatus } from '@prisma/client';
import { Request as NodeFetchRequest } from 'node-fetch';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  db: {
    convention: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock NextAuth getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Typed mocks for convenience
const mockedDb = db as jest.Mocked<typeof db>;
const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('API /api/conventions', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
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
      status: ConventionStatus.UPCOMING,
      bannerImageUrl: 'https://example.com/banner.jpg',
      galleryImageUrls: ['https://example.com/gallery1.jpg'],
    };

    it('should create a convention when user is ADMIN and data is valid', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const expectedSlug = 'test-convention';
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedDb.convention.create as jest.Mock).mockResolvedValue({
        id: 'newConventionId',
        ...validConventionPayload,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-03'),
        slug: expectedSlug,
        organizerUserId: 'adminUserId',
      });

      const request = new NodeFetchRequest('http://localhost/api/conventions', {
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
      expect(mockedDb.convention.create).toHaveBeenCalled();
    });

    it('should generate a unique slug if initial slug exists', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      
      const initialSlug = 'test-convention';
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existingConId', slug: initialSlug } as any); // Simulate slug conflict
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
      (mockedDb.convention.create as jest.Mock).mockImplementation(async (args: Prisma.ConventionCreateArgs) => {
        return { ...createdConventionData, slug: args.data.slug! };
      });


      const request = new NodeFetchRequest('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.slug).not.toBe(initialSlug); // Slug should have been modified
      expect(responseBody.slug).toMatch(new RegExp(`^${initialSlug}-\\d{5}$`)); // Matches 'test-convention-' followed by 5 digits
      expect(mockedDb.convention.create).toHaveBeenCalled();
      expect(mockedDb.convention.findUnique).toHaveBeenCalledWith({ where: { slug: initialSlug } });
    });

    it('should return 403 Forbidden if user is not ADMIN', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'nonAdminUserId', roles: [Role.USER] },
        expires: 'never',
      });

      const request = new NodeFetchRequest('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden');
      expect(mockedDb.convention.create).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if user is unauthenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NodeFetchRequest('http://localhost/api/conventions', {
        method: 'POST',
        body: JSON.stringify(validConventionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden');
      expect(mockedDb.convention.create).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request for invalid data (e.g., missing name)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const { name, ...invalidPayload } = validConventionPayload; // 'name' is removed

      const request = new NodeFetchRequest('http://localhost/api/conventions', {
        method: 'POST',
        // @ts-ignore to test invalid payload shape
        body: JSON.stringify(invalidPayload), 
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.errors).toHaveProperty('name');
      expect(mockedDb.convention.create).not.toHaveBeenCalled();
    });

    // TODO: Add test for Prisma P2002 error (unique constraint violation) if not covered by slug generation
  });

  describe('GET /api/conventions', () => {
    it('should return a list of conventions when user is ADMIN', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const mockConventions = [
        { id: 'con1', name: 'Convention Alpha', slug: 'convention-alpha', status: 'UPCOMING', organizerUserId: 'user1', startDate: new Date(), endDate: new Date(), city:'CityA', state:'ST', country:'CountryA', galleryImageUrls:[], createdAt: new Date(), updatedAt: new Date(), conventionSeriesId: null, bannerImageUrl:null, description:null, venueName:null, websiteUrl:null },
        { id: 'con2', name: 'Convention Beta', slug: 'convention-beta', status: 'ACTIVE', organizerUserId: 'user2', startDate: new Date(), endDate: new Date(), city:'CityB', state:'ST', country:'CountryB', galleryImageUrls:[], createdAt: new Date(), updatedAt: new Date(), conventionSeriesId: null, bannerImageUrl:null, description:null, venueName:null, websiteUrl:null },
      ];
      (mockedDb.convention.findMany as jest.Mock).mockResolvedValue(mockConventions);

      const request = new Request('http://localhost/api/conventions', { method: 'GET' });
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual(mockConventions);
      expect(mockedDb.convention.findMany).toHaveBeenCalledWith({});
    });

    it('should return 403 Forbidden if user is not ADMIN', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'nonAdminUserId', roles: [Role.USER] },
        expires: 'never',
      });

      const request = new Request('http://localhost/api/conventions', { method: 'GET' });
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden');
      expect(mockedDb.convention.findMany).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if user is unauthenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost/api/conventions', { method: 'GET' });
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden');
      expect(mockedDb.convention.findMany).not.toHaveBeenCalled();
    });
  });
}); 