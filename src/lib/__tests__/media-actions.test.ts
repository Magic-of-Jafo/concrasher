import { Role } from '@prisma/client';
import { updateConventionMedia } from '../actions';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { ConventionMediaData } from '../validators';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
    db: {
        convention: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        conventionMedia: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

// Mock next-auth
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn(),
}));

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

// Cast mocks to JestMock types
const mockGetServerSession = getServerSession as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;
const mockConventionFindUnique = db.convention.findUnique as jest.Mock;
const mockUserFindUnique = db.user.findUnique as jest.Mock;
const mockConventionMediaDeleteMany = db.conventionMedia.deleteMany as jest.Mock;
const mockConventionMediaCreateMany = db.conventionMedia.createMany as jest.Mock;
const mockTransaction = db.$transaction as jest.Mock;

describe('updateConventionMedia Server Action', () => {
    const mockUserId = 'user-123';
    const mockConventionId = 'clc1234567890123456789012';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Default successful transaction implementation
        mockTransaction.mockImplementation(async (callback) => {
            return await callback({
                conventionMedia: {
                    deleteMany: mockConventionMediaDeleteMany,
                    createMany: mockConventionMediaCreateMany,
                },
            });
        });
    });

    describe('Authentication and Authorization', () => {
        it('should return error if user is not authenticated', async () => {
            mockGetServerSession.mockResolvedValue(null);

            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Authentication required.');
            expect(mockConventionFindUnique).not.toHaveBeenCalled();
        });

        it('should return error if convention is not found', async () => {
            mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
            mockConventionFindUnique.mockResolvedValue(null);

            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Convention not found.');
            expect(mockConventionFindUnique).toHaveBeenCalledWith({
                where: { id: mockConventionId },
                include: {
                    series: {
                        select: { organizerUserId: true }
                    }
                }
            });
        });

        it('should allow access for convention organizer', async () => {
            mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
            mockConventionFindUnique.mockResolvedValue({
                id: mockConventionId,
                series: { organizerUserId: mockUserId }
            });
            mockUserFindUnique.mockResolvedValue({ roles: [Role.USER] });

            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Media updated successfully!');
        });

        it('should allow access for admin user', async () => {
            const differentUserId = 'different-user-123';
            mockGetServerSession.mockResolvedValue({ user: { id: differentUserId } });
            mockConventionFindUnique.mockResolvedValue({
                id: mockConventionId,
                series: { organizerUserId: mockUserId } // Different organizer
            });
            mockUserFindUnique.mockResolvedValue({ roles: [Role.ADMIN] });

            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Media updated successfully!');
        });

        it('should deny access for non-organizer non-admin', async () => {
            const differentUserId = 'different-user-123';
            mockGetServerSession.mockResolvedValue({ user: { id: differentUserId } });
            mockConventionFindUnique.mockResolvedValue({
                id: mockConventionId,
                series: { organizerUserId: mockUserId } // Different organizer
            });
            mockUserFindUnique.mockResolvedValue({ roles: [Role.USER] });

            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Authorization failed. You don't have permission to edit this convention.");
        });
    });

    describe('Data Validation', () => {
        beforeEach(() => {
            // Setup valid authentication
            mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
            mockConventionFindUnique.mockResolvedValue({
                id: mockConventionId,
                series: { organizerUserId: mockUserId }
            });
            mockUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
        });

        it('should validate image media data correctly', async () => {
            const validImageMedia: ConventionMediaData[] = [
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/clc1234567890123456789012/promotional/image1.jpg',
                    caption: 'Test image 1',
                    order: 0,
                }
            ];

            const result = await updateConventionMedia(mockConventionId, validImageMedia);

            expect(result.success).toBe(true);
            expect(mockConventionMediaCreateMany).toHaveBeenCalledWith({
                data: [{
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/clc1234567890123456789012/promotional/image1.jpg',
                    caption: 'Test image 1',
                    order: 0,
                }]
            });
        });

        it('should validate video media data correctly', async () => {
            const validVideoMedia = [
                {
                    conventionId: mockConventionId,
                    type: 'VIDEO_LINK' as const,
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    caption: 'Test video 1',
                    order: 0,
                },
            ];

            const result = await updateConventionMedia(mockConventionId, validVideoMedia);

            expect(result.success).toBe(true);
            expect(mockConventionMediaCreateMany).toHaveBeenCalledWith({
                data: [{
                    conventionId: mockConventionId,
                    type: 'VIDEO_LINK' as const,
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    caption: 'Test video 1',
                    order: 0,
                }]
            });
        });

        it('should handle null captions correctly', async () => {
            const mediaWithNullCaption = [
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/clc1234567890123456789012/promotional/image1.jpg',
                    caption: undefined,
                    order: 0,
                },
            ];

            const result = await updateConventionMedia(mockConventionId, mediaWithNullCaption);

            expect(result.success).toBe(true);
            expect(mockConventionMediaCreateMany).toHaveBeenCalledWith({
                data: [{
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/clc1234567890123456789012/promotional/image1.jpg',
                    caption: null,
                    order: 0,
                }]
            });
        });

        it('should reject invalid media type', async () => {
            const invalidMedia: any[] = [
                {
                    conventionId: mockConventionId,
                    type: 'INVALID_TYPE',
                    url: '/uploads/test.jpg',
                    caption: 'Test',
                    order: 0,
                }
            ];

            const result = await updateConventionMedia(mockConventionId, invalidMedia);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid media data provided.');
            expect(result.fieldErrors).toBeDefined();
        });

        it('should reject invalid URL format', async () => {
            const invalidMedia: any[] = [
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: 'invalid-url',
                    caption: 'Test',
                    order: 0,
                }
            ];

            const result = await updateConventionMedia(mockConventionId, invalidMedia);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid media data provided.');
            expect(result.fieldErrors).toBeDefined();
        });

        it('should reject negative order values', async () => {
            const invalidMedia: any[] = [
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/test.jpg',
                    caption: 'Test',
                    order: -1,
                }
            ];

            const result = await updateConventionMedia(mockConventionId, invalidMedia);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid media data provided.');
            expect(result.fieldErrors).toBeDefined();
        });
    });

    describe('Database Operations', () => {
        beforeEach(() => {
            // Setup valid authentication
            mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
            mockConventionFindUnique.mockResolvedValue({
                id: mockConventionId,
                series: { organizerUserId: mockUserId }
            });
            mockUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
        });

        it('should delete existing media and create new media in transaction', async () => {
            const mediaData: ConventionMediaData[] = [
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/clc1234567890123456789012/promotional/image1.jpg',
                    caption: 'Test image 1',
                    order: 0,
                },
                {
                    conventionId: mockConventionId,
                    type: 'VIDEO_LINK' as const,
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    caption: 'Test video 1',
                    order: 1,
                }
            ];

            const result = await updateConventionMedia(mockConventionId, mediaData);

            expect(result.success).toBe(true);
            expect(mockTransaction).toHaveBeenCalled();
            expect(mockConventionMediaDeleteMany).toHaveBeenCalledWith({
                where: { conventionId: mockConventionId }
            });
            expect(mockConventionMediaCreateMany).toHaveBeenCalledWith({
                data: [
                    {
                        conventionId: mockConventionId,
                        type: 'IMAGE' as const,
                        url: '/uploads/clc1234567890123456789012/promotional/image1.jpg',
                        caption: 'Test image 1',
                        order: 0,
                    },
                    {
                        conventionId: mockConventionId,
                        type: 'VIDEO_LINK' as const,
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        caption: 'Test video 1',
                        order: 1,
                    }
                ]
            });
            expect(mockRevalidatePath).toHaveBeenCalledWith(`/organizer/conventions/${mockConventionId}/edit`);
        });

        it('should handle empty media array correctly', async () => {
            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(true);
            expect(mockConventionMediaDeleteMany).toHaveBeenCalledWith({
                where: { conventionId: mockConventionId }
            });
            expect(mockConventionMediaCreateMany).not.toHaveBeenCalled();
        });

        it('should handle database transaction errors', async () => {
            mockTransaction.mockRejectedValue(new Error('Database transaction failed'));

            const result = await updateConventionMedia(mockConventionId, []);

            expect(result.success).toBe(false);
            expect(result.error).toBe('An unexpected error occurred while updating media.');
        });

        it('should set order correctly when not provided', async () => {
            const mediaData: ConventionMediaData[] = [
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/test1.jpg',
                    caption: 'Test image 1',
                    // order not provided, should default to index
                } as any,
                {
                    conventionId: mockConventionId,
                    type: 'IMAGE' as const,
                    url: '/uploads/test2.jpg',
                    caption: 'Test image 2',
                    // order not provided, should default to index
                } as any
            ];

            const result = await updateConventionMedia(mockConventionId, mediaData);

            expect(result.success).toBe(true);
            expect(mockConventionMediaCreateMany).toHaveBeenCalledWith({
                data: [
                    expect.objectContaining({ order: 0 }),
                    expect.objectContaining({ order: 1 }),
                ]
            });
        });
    });
}); 