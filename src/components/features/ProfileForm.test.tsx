import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileForm from './ProfileForm';
import { updateUserProfile } from '@/lib/actions'; // Adjust path as needed
import { z } from 'zod'; // Import Zod directly for mocking

// Mock the server action
jest.mock('@/lib/actions', () => ({
  updateUserProfile: jest.fn(),
}));

// Mock the validators module
jest.mock('@/lib/validators', () => ({
  ProfileSchema: z.object({
    name: z.string().min(1, 'Display name is required').optional().nullable(),
    bio: z.string().max(200, 'Bio must be 200 characters or less').optional().nullable(),
  }),
}));

const mockUpdateUserProfile = updateUserProfile as jest.Mock;

describe('ProfileForm', () => {
  beforeEach(() => {
    mockUpdateUserProfile.mockReset();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ProfileForm currentName="Initial Name" currentBio="Initial Bio" {...props} />
    );
  };

  it('renders with initial values', () => {
    renderComponent();
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Initial Name');
    expect(screen.getByLabelText(/Bio/i)).toHaveValue('Initial Bio');
  });

  it('allows typing in fields', () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/Display Name/i);
    const bioInput = screen.getByLabelText(/Bio/i);

    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.change(bioInput, { target: { value: 'New Bio' } });

    expect(nameInput).toHaveValue('New Name');
    expect(bioInput).toHaveValue('New Bio');
  });

  it('calls updateUserProfile with form data on submit and shows success', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: true,
      message: 'Profile updated!',
      user: {
        id: '1',
        name: 'Updated Name',
        bio: 'Updated Bio',
        email: 'test@test.com',
        image: null,
      },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Display Name/i), {
      target: { value: 'Updated Name' },
    });
    fireEvent.change(screen.getByLabelText(/Bio/i), {
      target: { value: 'Updated Bio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        name: 'Updated Name',
        bio: 'Updated Bio',
      });
    });
    expect(await screen.findByText('Profile updated!')).toBeInTheDocument();
    // Form should reset to new values
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Updated Name');
    expect(screen.getByLabelText(/Bio/i)).toHaveValue('Updated Bio');
  });

  it('shows server error message on failed update', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: false,
      error: 'Update failed on server',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Display Name/i), {
      target: { value: 'Bad Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });
    expect(
      await screen.findByText('Update failed on server')
    ).toBeInTheDocument();
    // Form should not reset
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Bad Name');
  });

  it('submit button is initially disabled if form is not dirty (no changes)', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /Save Changes/i })
    ).toBeDisabled();
  });

  it('submit button becomes enabled when form is dirty', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /Save Changes/i })
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Display Name/i), {
      target: { value: 'Made a change' },
    });
    expect(
      screen.getByRole('button', { name: /Save Changes/i })
    ).not.toBeDisabled();
  });

  it('calls onProfileUpdate callback on successful update', async () => {
    const mockOnProfileUpdate = jest.fn();
    const updatedUserData = {
      id: '1',
      name: 'Callback Name',
      bio: 'Callback Bio',
      email: 'test@test.com',
      image: null,
    };
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: true,
      message: 'Profile updated!',
      user: updatedUserData,
    });

    renderComponent({ onProfileUpdate: mockOnProfileUpdate });

    fireEvent.change(screen.getByLabelText(/Display Name/i), {
      target: { value: 'Callback Name' },
    });
    fireEvent.change(screen.getByLabelText(/Bio/i), {
      target: { value: 'Callback Bio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockOnProfileUpdate).toHaveBeenCalledWith({
        name: 'Callback Name',
        bio: 'Callback Bio',
      });
    });
  });
}); 