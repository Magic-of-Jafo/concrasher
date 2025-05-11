import { Role, ApplicationStatus, RequestedRole } from '@prisma/client';
import { applyForOrganizerRole, activateTalentRole, deactivateTalentRole } from '../actions';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    roleApplication: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock next-auth
jest.mock('next-auth', () => ({
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
const mockDbRoleApplicationCreate = db.roleApplication.create as jest.Mock;
const mockGetServerSession = getServerSession as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('Server Actions - User Roles and Applications', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockDbUserFindUnique.mockReset();
    mockDbUserUpdate.mockReset();
    mockDbRoleApplicationFindFirst.mockReset();
    mockDbRoleApplicationCreate.mockReset();
    mockGetServerSession.mockReset();
    mockRevalidatePath.mockReset();
  });

  describe('applyForOrganizerRole', () => {
    const mockUserId = 'user-123';

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const result = await applyForOrganizerRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required. Please log in.');
      expect(mockDbRoleApplicationCreate).not.toHaveBeenCalled();
    });

    it('should return error if user is already an ORGANIZER', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER, Role.ORGANIZER] });
      const result = await applyForOrganizerRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('You are already an Organizer.');
      expect(result.applicationStatus).toBe(ApplicationStatus.APPROVED);
      expect(mockDbRoleApplicationCreate).not.toHaveBeenCalled();
    });

    it('should return error if user has a PENDING ORGANIZER application', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
      mockDbRoleApplicationFindFirst.mockResolvedValue({ id: 'app-id', status: ApplicationStatus.PENDING });
      const result = await applyForOrganizerRole();
      expect(result.success).toBe(false);
      expect(result.error).toBe('You already have a pending application for the Organizer role.');
      expect(result.applicationStatus).toBe(ApplicationStatus.PENDING);
      expect(mockDbRoleApplicationCreate).not.toHaveBeenCalled();
    });

    it('should create a PENDING ORGANIZER application for eligible user', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
      mockDbRoleApplicationFindFirst.mockResolvedValue(null); // No existing PENDING application
      mockDbRoleApplicationCreate.mockResolvedValue({ 
        id: 'new-app-id', 
        userId: mockUserId, 
        requestedRole: RequestedRole.ORGANIZER, 
        status: ApplicationStatus.PENDING 
      });

      const result = await applyForOrganizerRole();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Your application for the Organizer role has been submitted successfully.');
      expect(result.applicationStatus).toBe(ApplicationStatus.PENDING);
      expect(mockDbRoleApplicationCreate).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          requestedRole: RequestedRole.ORGANIZER,
          status: ApplicationStatus.PENDING,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
    });

    it('should handle database errors during application creation', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
      mockDbUserFindUnique.mockResolvedValue({ roles: [Role.USER] });
      mockDbRoleApplicationFindFirst.mockResolvedValue(null);
      mockDbRoleApplicationCreate.mockRejectedValue(new Error('DB error'));

      const result = await applyForOrganizerRole();

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while submitting your application. Please try again.');
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
}); 