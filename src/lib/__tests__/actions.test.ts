import { Role, ApplicationStatus, RequestedRole } from '@prisma/client';
import { requestRoles, activateTalentRole, deactivateTalentRole, createBrand } from '../actions';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';

// Declare mock functions first to avoid ReferenceError
// Mock variables will be created inside jest.mock() factory functions

// Mock Prisma client using the declared functions
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    roleApplication: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    brand: {
      create: jest.fn(),
    },
    brandUser: {
      create: jest.fn(),
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

// Cast mocks to JestMock types for intellisense and type safety
const mockDbUserFindUnique = db.user.findUnique as jest.Mock;
const mockDbUserUpdate = db.user.update as jest.Mock;
const mockDbRoleApplicationFindFirst = db.roleApplication.findFirst as jest.Mock;
const mockDbRoleApplicationFindMany = db.roleApplication.findMany as jest.Mock;
const mockDbRoleApplicationCreate = db.roleApplication.create as jest.Mock;
const mockDbRoleApplicationCreateMany = db.roleApplication.createMany as jest.Mock;
const mockGetServerSession = getServerSession as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

// Get mock functions from mocked db
const mockUserFindUnique = db.user.findUnique as jest.Mock;
const mockUserUpdate = db.user.update as jest.Mock;
const mockRoleApplicationFindFirst = db.roleApplication.findFirst as jest.Mock;
const mockRoleApplicationCreate = db.roleApplication.create as jest.Mock;
const mockRoleApplicationCreateMany = db.roleApplication.createMany as jest.Mock;
const mockBrandCreate = db.brand.create as jest.Mock;
const mockBrandUserCreate = db.brandUser.create as jest.Mock;
const mockTransaction = db.$transaction as jest.Mock;

describe('Server Actions - User Roles and Applications', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUserFindUnique.mockReset();
    mockUserUpdate.mockReset();
    mockRoleApplicationFindFirst.mockReset();
    mockDbRoleApplicationFindMany.mockReset();
    mockRoleApplicationCreate.mockReset();
    mockRoleApplicationCreateMany.mockReset();
    mockGetServerSession.mockReset();
    mockRevalidatePath.mockReset();
    mockBrandCreate.mockReset();
    mockBrandUserCreate.mockReset();
    mockTransaction.mockReset();
  });

  describe('requestRoles', () => {
    const mockUserId = 'user-123';

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const result = await requestRoles([RequestedRole.ORGANIZER]);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required. Please log in.');
      expect(mockDbRoleApplicationCreateMany).not.toHaveBeenCalled();
    });

    it('should return error if user is already an ORGANIZER', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER, Role.ORGANIZER] });
      const result = await requestRoles([RequestedRole.ORGANIZER]);
      expect(result.success).toBe(false);
      expect(result.error).toBe('You either already have the requested role(s) or an application is already pending.');
      expect(mockDbRoleApplicationCreateMany).not.toHaveBeenCalled();
    });
  });

  describe('activateTalentRole', () => {
    const mockUserId = 'user-456';

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const result = await activateTalentRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required. Please log in.');
      expect(mockDbUserUpdate).not.toHaveBeenCalled();
    });

    it('should return error if user is not found (though unlikely with session)', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue(null);
      const result = await activateTalentRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found.');
      expect(mockDbUserUpdate).not.toHaveBeenCalled();
    });

    it('should return error if user is already a TALENT', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER, Role.TALENT] });
      const result = await activateTalentRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Talent role is already active.');
      expect(result.roles).toEqual([Role.USER, Role.TALENT]);
      expect(mockDbUserUpdate).not.toHaveBeenCalled();
    });

    it('should add TALENT role to user and return updated roles', async () => {
      const initialRoles = [Role.USER];
      const updatedRoles = [Role.USER, Role.TALENT];
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: initialRoles });
      mockDbUserUpdate.mockResolvedValue({ id: mockUserId, roles: updatedRoles });

      const result = await activateTalentRole();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Talent role has been activated successfully!');
      expect(result.roles).toEqual(updatedRoles);
      expect(mockDbUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { roles: updatedRoles },
        select: { roles: true },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
    });

    it('should preserve existing other roles when adding TALENT role', async () => {
      const initialRoles = [Role.USER, Role.ORGANIZER]; // User is also an Organizer
      const updatedRoles = [Role.USER, Role.ORGANIZER, Role.TALENT];
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: initialRoles });
      mockDbUserUpdate.mockResolvedValue({ id: mockUserId, roles: updatedRoles });

      const result = await activateTalentRole();

      expect(result.success).toBe(true);
      expect(result.roles).toEqual(updatedRoles);
      expect(mockDbUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { roles: updatedRoles },
        select: { roles: true },
      });
    });

    it('should handle database errors during role activation', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
      mockDbUserUpdate.mockRejectedValue(new Error('DB error'));

      const result = await activateTalentRole();

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while activating the Talent role. Please try again.');
    });
  });

  describe('deactivateTalentRole', () => {
    const mockUserId = 'user-789';

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const result = await deactivateTalentRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required. Please log in.');
      expect(mockDbUserUpdate).not.toHaveBeenCalled();
    });

    it('should return error if user is not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue(null);
      const result = await deactivateTalentRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found.');
      expect(mockDbUserUpdate).not.toHaveBeenCalled();
    });

    it('should return error if user is not a TALENT', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER] }); // Not a talent
      const result = await deactivateTalentRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Talent role is not active, cannot deactivate.');
      expect(result.roles).toEqual([Role.USER]);
      expect(mockDbUserUpdate).not.toHaveBeenCalled();
    });

    it('should remove TALENT role and return updated roles', async () => {
      const initialRoles = [Role.USER, Role.TALENT];
      const finalRoles = [Role.USER];
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: initialRoles });
      mockDbUserUpdate.mockResolvedValue({ id: mockUserId, roles: finalRoles });

      const result = await deactivateTalentRole();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Talent role has been deactivated successfully.');
      expect(result.roles).toEqual(finalRoles);
      expect(mockDbUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { roles: finalRoles },
        select: { roles: true },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
    });

    it('should preserve other roles when removing TALENT role', async () => {
      const initialRoles = [Role.USER, Role.ORGANIZER, Role.TALENT];
      const finalRoles = [Role.USER, Role.ORGANIZER];
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: initialRoles });
      mockDbUserUpdate.mockResolvedValue({ id: mockUserId, roles: finalRoles });

      const result = await deactivateTalentRole();

      expect(result.success).toBe(true);
      expect(result.roles).toEqual(finalRoles);
      expect(mockDbUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { roles: finalRoles },
        select: { roles: true },
      });
    });

    it('should handle database errors during role deactivation', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER, Role.TALENT] });
      mockDbUserUpdate.mockRejectedValue(new Error('DB error'));

      const result = await deactivateTalentRole();

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while deactivating the Talent role. Please try again.');
    });
  });

  describe('createBrand', () => {
    const mockUserId = 'user-brand-creator';
    const mockBrandData = { name: 'Test Brand', description: 'A cool brand.' };

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const result = await createBrand(mockBrandData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required.');
    });

    it('should require BRAND_CREATOR role or ADMIN role', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
      mockDbRoleApplicationFindFirst.mockResolvedValue(null);
      const result = await createBrand(mockBrandData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authorization failed: You must have an approved Brand Creator application to perform this action.');
    });

    it('should return a validation error for invalid data', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.ADMIN] });
      const result = await createBrand({ name: 'a', description: '' });
      expect(result.success).toBe(false);
      expect(result.fieldErrors).not.toBeNull();
    });

    it('should create a brand for an authorized user', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.ADMIN] });

      const mockBrand = { id: 'brand-1', name: mockBrandData.name, description: mockBrandData.description };

      // Mock the transaction to call the callback with a mock prisma instance
      mockTransaction.mockImplementation(async (callback) => {
        const mockPrisma = {
          brand: {
            create: jest.fn().mockResolvedValue(mockBrand),
          },
          brandUser: {
            create: jest.fn().mockResolvedValue({ id: 'branduser-1' }),
          },
        };
        return await callback(mockPrisma);
      });

      const result = await createBrand(mockBrandData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Brand created successfully!');
      expect(result.brand).toBeDefined();
      expect(result.brand).toEqual(mockBrand);
      expect(mockTransaction).toHaveBeenCalled();
    });
  });
}); 