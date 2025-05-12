import { GET, PUT, DELETE } from './route';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { Role, ConventionStatus, Prisma } from '@prisma/client';
import { ConventionUpdateInput } from '@/lib/validators';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  db: {
    convention: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock NextAuth getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const sampleConventionId = 'clxkz0example000008l7aaaa0000';
const sampleConventionSlug = 'sample-convention';
const sampleConvention = {
  id: sampleConventionId,
  name: 'Sample Convention',
  slug: sampleConventionSlug,
  startDate: new Date('2025-07-01T00:00:00.000Z'),
  endDate: new Date('2025-07-03T00:00:00.000Z'),
  city: 'Sample City',
  state: 'SS',
  country: 'Sampleland',
  venueName: 'Sample Venue',
  description: 'A great sample convention',
  websiteUrl: 'https://example.com/sample-con',
  organizerUserId: 'orgUserId123',
  conventionSeriesId: null,
  status: ConventionStatus.UPCOMING,
  bannerImageUrl: 'https://example.com/banner.jpg',
  galleryImageUrls: [],
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('API /api/conventions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/conventions/[id]', () => {
    it('should return a convention when user is ADMIN and convention exists (by ID)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(sampleConvention);

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, { method: 'GET' });
      const response = await GET(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual(sampleConvention);
      expect(mockedDb.convention.findUnique).toHaveBeenCalledWith({ where: { id: sampleConventionId } });
    });

    it('should return a convention when user is ADMIN and convention exists (by slug)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      // Simulate ID lookup fails, then slug lookup succeeds
      (mockedDb.convention.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // For ID lookup if ID doesn't match cuid format or not found
        .mockResolvedValueOnce(sampleConvention); // For slug lookup

      const request = new Request(`http://localhost/api/conventions/${sampleConventionSlug}`, { method: 'GET' });
      const response = await GET(request, { params: { id: sampleConventionSlug } });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual(sampleConvention);
      // First call could be for ID (if slug doesn't look like CUID) or direct slug if it does.
      // The handler logic is: if id.length === 25 && id.startsWith('c'), then try ID first.
      // sampleConventionSlug does not look like a CUID, so it will try by slug directly after the ID check (which will use the slug as ID initially).
      expect(mockedDb.convention.findUnique).toHaveBeenCalledWith({ where: { slug: sampleConventionSlug } });
    });

    it('should return 404 Not Found if convention does not exist', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/conventions/nonExistentId', { method: 'GET' });
      const response = await GET(request, { params: { id: 'nonExistentId' } });
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.message).toBe('Convention not found');
    });

    it('should return 403 Forbidden if user is not ADMIN', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'nonAdminUserId', roles: [Role.USER] },
        expires: 'never',
      });

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, { method: 'GET' });
      const response = await GET(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden');
      expect(mockedDb.convention.findUnique).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if user is unauthenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, { method: 'GET' });
      const response = await GET(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(403);
      expect(responseBody.message).toBe('Forbidden');
      expect(mockedDb.convention.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/conventions/[id]', () => {
    const updatePayload: ConventionUpdateInput = {
      name: 'Updated Sample Convention',
      description: 'An updated description for the sample convention.',
      status: ConventionStatus.ACTIVE,
    };

    it('should update a convention when user is ADMIN and data is valid (by ID)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const updatedConvention = { ...sampleConvention, ...updatePayload, updatedAt: new Date() };
      (mockedDb.convention.update as jest.Mock).mockResolvedValue(updatedConvention);

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.name).toBe(updatePayload.name);
      expect(responseBody.description).toBe(updatePayload.description);
      expect(responseBody.status).toBe(updatePayload.status);
      expect(mockedDb.convention.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleConventionId },
          data: expect.objectContaining(updatePayload),
        })
      );
    });

    it('should update a convention when user is ADMIN and data is valid (by slug)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const updatedConvention = { ...sampleConvention, ...updatePayload, slug: sampleConventionSlug, updatedAt: new Date() };
      // --- Mock the initial find to succeed ---
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(sampleConvention);
      // --- Then mock the update ---
      (mockedDb.convention.update as jest.Mock).mockResolvedValue(updatedConvention);

      const request = new Request(`http://localhost/api/conventions/${sampleConventionSlug}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: sampleConventionSlug } });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.name).toBe(updatePayload.name);
      expect(mockedDb.convention.update).toHaveBeenCalledWith({
        where: { id: sampleConventionId },
        data: updatePayload,
      });
    });

    it('should return 400 Bad Request for invalid data', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      const invalidUpdatePayload = { websiteUrl: 'not-a-url' };
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(sampleConvention);

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, {
        method: 'PUT',
        body: JSON.stringify(invalidUpdatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.errors).toHaveProperty('websiteUrl');
      expect(mockedDb.convention.update).not.toHaveBeenCalled();
    });

    it('should return 404 Not Found if convention to update does not exist', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/conventions/nonExistentId', {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: 'nonExistentId' } });
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.message).toBe('Convention not found');
    });
    
    it('should return 409 Conflict if slug update violates unique constraint', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(sampleConvention);
      (mockedDb.convention.update as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['slug'] },
      });

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updatePayload, slug: 'existing-slug' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.message).toContain('unique constraint violation');
    });

    it('should return 403 Forbidden if user is not ADMIN', async () => {
      mockedGetServerSession.mockResolvedValue({ user: { id: 'user1', roles: [Role.USER] }, expires: 'never' });
      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: sampleConventionId } });
      expect(response.status).toBe(403);
      expect(mockedDb.convention.update).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if user is unauthenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request, { params: { id: sampleConventionId } });
      expect(response.status).toBe(403);
      expect(mockedDb.convention.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/conventions/[id]', () => {
    it('should delete a convention when user is ADMIN (by ID)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(sampleConvention);
      (mockedDb.convention.delete as jest.Mock).mockResolvedValue(sampleConvention); // Return deleted item

      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: { id: sampleConventionId } });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Convention deleted successfully');
      expect(mockedDb.convention.delete).toHaveBeenCalledWith({ where: { id: sampleConventionId } });
    });

    it('should delete a convention when user is ADMIN (by slug)', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(sampleConvention);
      (mockedDb.convention.delete as jest.Mock).mockResolvedValueOnce(sampleConvention); // for the delete call

      const request = new Request(`http://localhost/api/conventions/${sampleConventionSlug}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: { id: sampleConventionSlug } });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Convention deleted successfully');
      expect(mockedDb.convention.delete).toHaveBeenCalledWith({ where: { id: sampleConventionId } });
    });

    it('should return 404 Not Found if convention to delete does not exist', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'adminUserId', roles: [Role.ADMIN] },
        expires: 'never',
      });
      (mockedDb.convention.delete as jest.Mock).mockRejectedValue(
        // Simulate Prisma error object structure
        Object.assign(new Error('Record to delete not found.'), { code: 'P2025' })
      );
      (mockedDb.convention.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/conventions/nonExistentId', { method: 'DELETE' });
      const response = await DELETE(request, { params: { id: 'nonExistentId' } });
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.message).toBe('Convention not found');
    });

    it('should return 403 Forbidden if user is not ADMIN', async () => {
      mockedGetServerSession.mockResolvedValue({ user: { id: 'user1', roles: [Role.USER] }, expires: 'never' });
      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: { id: sampleConventionId } });
      expect(response.status).toBe(403);
      expect(mockedDb.convention.delete).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if user is unauthenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      const request = new Request(`http://localhost/api/conventions/${sampleConventionId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: { id: sampleConventionId } });
      expect(response.status).toBe(403);
      expect(mockedDb.convention.delete).not.toHaveBeenCalled();
    });
  });
});