import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilePage from './page'; // Assuming this is the path to ProfilePage
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db'; // Adjust path as needed
import { redirect, RedirectType } from 'next/navigation'; // Added RedirectType

// Mocks
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock ProfileForm component as it's tested separately and is a client component
jest.mock('@/components/features/ProfileForm', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function DummyProfileForm({ currentName, currentBio }: { currentName?: string | null; currentBio?: string | null}) { // Added types
    return (
      <div>
        <span>Mocked ProfileForm</span>
        <span>Name: {currentName || 'N/A'}</span>
        <span>Bio: {currentBio || 'N/A'}</span>
      </div>
    );
  };
});


const mockGetServerSession = getServerSession as jest.Mock;
const mockDbUserFindUnique = db.user.findUnique as jest.Mock;
// Corrected type for redirect mock
const mockRedirect = redirect as jest.Mock<never, [url: string, type?: RedirectType | undefined]>;

describe('ProfilePage', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockDbUserFindUnique.mockReset();
    mockRedirect.mockReset();
  });

  it('redirects to /login if no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    // As ProfilePage is async, we need to await its rendering or the promise it returns
    const PagePromise = ProfilePage();
    // Check that the promise resolves (component rendering finishes) and then check redirect
    // For server components that redirect, they might not return typical JSX if redirect occurs early.
    // We await the component's promise to ensure it has executed.
    try {
        await PagePromise;
    } catch (error) {
        // If redirect throws an error (Next.js specific behavior), catch it.
        // Or if it resolves because redirect doesn't throw in test env, proceed to check mock.
    }
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login if session exists but user.id is missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} }); // No user.id
    try {
        await ProfilePage();
    } catch (error) {}
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('displays error if user not found in DB despite session', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'test-user-id' } });
    mockDbUserFindUnique.mockResolvedValue(null);
    
    // Since ProfilePage is an async Server Component, await its rendering.
    const PageComponent = await ProfilePage();
    render(PageComponent);

    expect(await screen.findByText('Error')).toBeInTheDocument();
    expect(await screen.findByText('Could not load user profile. Please try logging out and back in.')).toBeInTheDocument();
  });

  it('renders user profile information and ProfileForm for authenticated user', async () => {
    const mockUser = {
      email: 'test@example.com',
      name: 'Test User',
      bio: 'This is a test bio.',
    };
    mockGetServerSession.mockResolvedValue({ user: { id: 'test-user-id' } });
    mockDbUserFindUnique.mockResolvedValue(mockUser);

    const PageComponent = await ProfilePage();
    render(PageComponent);

    expect(await screen.findByText('Your Profile')).toBeInTheDocument();
    expect(screen.getByText(`Email: ${mockUser.email}`)).toBeInTheDocument();
    expect(screen.getByText(`Display Name: ${mockUser.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Bio: ${mockUser.bio}`)).toBeInTheDocument();
    
    // Check for mocked ProfileForm rendering
    expect(screen.getByText('Mocked ProfileForm')).toBeInTheDocument();
    expect(screen.getByText(`Name: ${mockUser.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Bio: ${mockUser.bio}`)).toBeInTheDocument();
  });

  it('displays "Not set" if user name or bio are null/undefined', async () => {
    const mockUser = {
      email: 'test@example.com',
      name: null,
      bio: undefined,
    };
    mockGetServerSession.mockResolvedValue({ user: { id: 'test-user-id' } });
    mockDbUserFindUnique.mockResolvedValue(mockUser);

    const PageComponent = await ProfilePage();
    render(PageComponent);

    expect(screen.getByText('Display Name: Not set')).toBeInTheDocument();
    expect(screen.getByText('Bio: Not set')).toBeInTheDocument();
    // Check ProfileForm mock with these values
    expect(screen.getByText('Name: N/A')).toBeInTheDocument(); // Mock form will show N/A for null/undefined
    expect(screen.getByText('Bio: N/A')).toBeInTheDocument();
  });
}); 