import { updateUserProfile } from './actions';
import { getServerSession } from 'next-auth';
import { db } from './db';
import { revalidatePath } from 'next/cache';
import { ProfileSchema } from './validators';

// Mocks
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('./db', () => ({
  db: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Typed mocks
const mockGetServerSession = getServerSession as jest.Mock;
const mockDbUserUpdate = db.user.update as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('updateUserProfile Server Action', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockGetServerSession.mockReset();
    mockDbUserUpdate.mockReset();
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
    expect(mockDbUserUpdate).not.toHaveBeenCalled();
  });

  it('should return validation error for invalid data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const invalidData = { name: '' }; // name is required if provided
    const result = await updateUserProfile(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input.');
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors?.name).toContain('Display name is required');
    expect(mockDbUserUpdate).not.toHaveBeenCalled();
  });

  it('should successfully update profile and revalidate path for valid data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const updatedUser = {
      id: mockSession.user.id,
      email: mockSession.user.email,
      ...validProfileData,
      image: null, // Assuming image is part of user model
    };
    mockDbUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(validProfileData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Profile updated successfully.');
    expect(result.user).toEqual(updatedUser);
    expect(mockDbUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: validProfileData,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
  });

  it('should handle database update errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockDbUserUpdate.mockRejectedValue(new Error('DB update failed'));

    const result = await updateUserProfile(validProfileData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected error occurred. Please try again.');
    expect(mockDbUserUpdate).toHaveBeenCalledWith({
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
    mockDbUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(partialData);

    expect(result.success).toBe(true);
    expect(mockDbUserUpdate).toHaveBeenCalledWith({
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
    mockDbUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(partialData);

    expect(result.success).toBe(true);
    expect(mockDbUserUpdate).toHaveBeenCalledWith({
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
    mockDbUserUpdate.mockResolvedValue(updatedUser);

    const result = await updateUserProfile(dataToClearBio);
    expect(result.success).toBe(true);
    expect(mockDbUserUpdate).toHaveBeenCalledWith({
      where: { id: mockSession.user.id },
      data: expectedDbData,
    });
  });

}); 