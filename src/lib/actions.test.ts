import { updateUserProfile } from './actions';
import { getServerSession } from 'next-auth/next';
import { db } from './db';
import { revalidatePath } from 'next/cache';
import { ProfileSchema } from './validators';
import { reviewOrganizerApplication, getPendingOrganizerApplicationsAction } from './actions';
import { Role, ApplicationStatus, RequestedRole, User } from '@prisma/client';

// Mocks
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Expanded mock for the entire db object as needed by tests
const mockUserUpdate = jest.fn();
const mockRoleApplicationFindUnique = jest.fn();
const mockRoleApplicationUpdate = jest.fn();
const mockRoleApplicationFindMany = jest.fn();
const mockTransaction = jest.fn().mockImplementation(async (callback) => callback(db)); // Basic pass-through for transaction

jest.mock('./db', () => ({
  db: {
    user: {
      update: mockUserUpdate,
    },
    roleApplication: {
      findUnique: mockRoleApplicationFindUnique,
      update: mockRoleApplicationUpdate,
      findMany: mockRoleApplicationFindMany,
    },
    $transaction: mockTransaction,
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Typed mocks
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

describe('updateUserProfile Server Action', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockUserUpdate.mockReset();
    mockRevalidatePath.mockReset();
  });

  const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com', name: 'Old Name' },
  };

  const validProfileData = {
    name: 'New Name',
    bio: 'New Bio',
  };

  it('should return authentication error if no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = await updateUserProfile(validProfileData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required. Please log in.');
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('should return validation error for invalid data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const invalidData = { name: '' }; // name is required if provided
    const result = await updateUserProfile(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input.');
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors?.name).toContain('Display name is required');
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('should successfully update profile and revalidate path for valid data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const updatedUser = {
      id: mockSession.user.id,
      email: mockSession.user.email,
      ...validProfileData,
      image: null, // Assuming image is part of user model
    };
    mockUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(validProfileData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Profile updated successfully.');
    expect(result.user).toEqual(updatedUser);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: validProfileData,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
  });

  it('should handle database update errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockUserUpdate.mockRejectedValue(new Error('DB update failed'));

    const result = await updateUserProfile(validProfileData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected error occurred. Please try again.');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: validProfileData,
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should allow updating only name', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const partialData = { name: 'Only New Name' };
    const expectedDbData = { name: 'Only New Name', bio: undefined }; // Zod makes unspecified optionals undefined
    const updatedUser = { ...mockSession.user, ...expectedDbData };
    mockUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(partialData);

    expect(result.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: expectedDbData,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
  });

  it('should allow updating only bio', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const partialData = { bio: 'Only New Bio' };
    const expectedDbData = { name: undefined, bio: 'Only New Bio' };
    const updatedUser = { ...mockSession.user, ...expectedDbData };
    mockUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(partialData);

    expect(result.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: expectedDbData,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
  });

  it('should allow clearing bio by passing an empty string (if schema allows, current does)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const dataToClearBio = { name: 'Keep Name', bio: '' };
    const expectedDbData = { name: 'Keep Name', bio: '' }; 
    const updatedUser = { ...mockSession.user, ...expectedDbData };    
    mockUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(dataToClearBio);
    expect(result.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: expectedDbData,
    });
  });

});

describe('reviewOrganizerApplication', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clears all mocks, including those above
    // Re-mock transaction specifically if its behavior needs to be default for this suite
    mockTransaction.mockImplementation(async (callback) => callback(db)); 
  });

  const adminUserSession = {
    user: { id: 'adminUserId', roles: [Role.ADMIN] as Role[] }, // ensure Role[] type
  };

  const normalUserSession = {
    user: { id: 'normalUserId', roles: [Role.USER] as Role[] }, // ensure Role[] type
  };

  const sampleApplicationId = 'app123';
  const applicantUserId = 'user456';

  const pendingOrganizerApplication = {
    id: sampleApplicationId,
    userId: applicantUserId,
    requestedRole: RequestedRole.ORGANIZER,
    status: ApplicationStatus.PENDING,
    user: {
      id: applicantUserId,
      roles: [Role.USER] as Role[],
      name: 'Test User',
      email: 'test@example.com',
    } as User & { roles: Role[] }, // More specific type for user within application
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should approve a pending ORGANIZER application', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue(pendingOrganizerApplication);
    mockUserUpdate.mockResolvedValue({}); 
    mockRoleApplicationUpdate.mockResolvedValue({}); 

    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Application approved successfully.');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: applicantUserId },
      data: { roles: { set: [Role.USER, Role.ORGANIZER] } },
    });
    expect(mockRoleApplicationUpdate).toHaveBeenCalledWith({
      where: { id: sampleApplicationId },
      data: { status: ApplicationStatus.APPROVED },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/dashboard');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/applications');
  });

  it('should reject a pending ORGANIZER application', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue(pendingOrganizerApplication);
    mockRoleApplicationUpdate.mockResolvedValue({});

    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.REJECTED);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Application rejected successfully.');
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockRoleApplicationUpdate).toHaveBeenCalledWith({
      where: { id: sampleApplicationId },
      data: { status: ApplicationStatus.REJECTED },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/dashboard');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/applications');
  });

  it('should return unauthorized if user is not admin', async () => {
    mockGetServerSession.mockResolvedValue(normalUserSession as any);
    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Unauthorized: Admin role required.');
    expect(mockRoleApplicationFindUnique).not.toHaveBeenCalled();
  });

  it('should return error if application not found', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue(null);
    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Application not found.');
  });

  it('should return error if application is not for ORGANIZER role', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue({
      ...pendingOrganizerApplication,
      requestedRole: 'TALENT' as RequestedRole, // Ensure correct type
    });
    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);
    expect(result.success).toBe(false);
    expect(result.message).toBe('This action is only for ORGANIZER role applications.');
  });
  
  it('should return error if application is not PENDING', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue({
      ...pendingOrganizerApplication,
      status: ApplicationStatus.APPROVED, 
    });
    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);
    expect(result.success).toBe(false);
    expect(result.message).toBe(`Application is not in PENDING state (current: ${ApplicationStatus.APPROVED}).`);
  });

  it('should handle database errors gracefully during approval', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue(pendingOrganizerApplication);
    mockTransaction.mockImplementationOnce(async () => { // Target the specific mock
      throw new Error('DB transaction error');
    });
    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);
    expect(result.success).toBe(false);
    expect(result.message).toBe('An error occurred while processing the application.');
  });

  it('should handle database errors gracefully during rejection', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    mockRoleApplicationFindUnique.mockResolvedValue(pendingOrganizerApplication);
    mockRoleApplicationUpdate.mockRejectedValueOnce(new Error('DB update error')); // Target the specific mock
    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.REJECTED);
    expect(result.success).toBe(false);
    expect(result.message).toBe('An error occurred while processing the application.'); // Consistent error message
  });

  it('should approve and set roles correctly even if user somehow already has ORGANIZER role', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    const appWithUserAlreadyOrganizer = {
      ...pendingOrganizerApplication,
      user: {
        ...pendingOrganizerApplication.user,
        roles: [Role.USER, Role.ORGANIZER] as Role[], 
      } as User & { roles: Role[] }, // Cast to satisfy stricter type check if necessary
    };
    mockRoleApplicationFindUnique.mockResolvedValue(appWithUserAlreadyOrganizer);
    mockUserUpdate.mockResolvedValue({});
    mockRoleApplicationUpdate.mockResolvedValue({});

    const result = await reviewOrganizerApplication(sampleApplicationId, ApplicationStatus.APPROVED);
    expect(result.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: applicantUserId },
      data: { roles: { set: expect.arrayContaining([Role.USER, Role.ORGANIZER]) } }, // Use arrayContaining for set
    });
  });

});

// Basic describe block for getPendingOrganizerApplicationsAction for completeness, can be expanded
describe('getPendingOrganizerApplicationsAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adminUserSession = {
    user: { id: 'adminUserId', roles: [Role.ADMIN] as Role[] },
  };

  const pendingOrganizerApplicationForList = {
    // ... (define a base object similar to pendingOrganizerApplication if needed for DRYness)
    // For now, create specific objects for the list test
    id: 'app1',
    userId: 'user456',
    requestedRole: RequestedRole.ORGANIZER,
    status: ApplicationStatus.PENDING,
    user: { id: 'user456', name: 'Test User', email: 'test@example.com' },
    createdAt: new Date(), // Will be stringified by action
    updatedAt: new Date(), // Will be stringified by action
  };

  it('should return applications for admin user', async () => {
    mockGetServerSession.mockResolvedValue(adminUserSession as any);
    const mockAppsRaw = [
      { ...pendingOrganizerApplicationForList, id: 'app1' },
      { 
        ...pendingOrganizerApplicationForList, 
        id: 'app2', 
        userId: 'user789', 
        user: { id: 'user789', name: 'Another User', email: 'another@example.com' } 
      },
    ];
    // Ensure dates are actual Date objects for the mockResolvedValue, action will stringify them
    const mockAppsWithDates = mockAppsRaw.map(app => ({...app, createdAt: new Date(), updatedAt: new Date()}));
    mockRoleApplicationFindMany.mockResolvedValue(mockAppsWithDates);

    const result = await getPendingOrganizerApplicationsAction();

    expect(result.success).toBe(true);
    expect(result.applications).toHaveLength(2);
    expect(result.applications?.[0].id).toBe('app1');
    expect(typeof result.applications?.[0].createdAt).toBe('string'); // Action stringifies dates
    expect(mockRoleApplicationFindMany).toHaveBeenCalledWith({
      where: {
        status: ApplicationStatus.PENDING,
        requestedRole: RequestedRole.ORGANIZER,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('should return unauthorized if user is not admin', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'someUserId', roles: [Role.USER] as Role[]}} as any);
    const result = await getPendingOrganizerApplicationsAction();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized: Admin role required.');
    expect(mockRoleApplicationFindMany).not.toHaveBeenCalled();
  });
}); 