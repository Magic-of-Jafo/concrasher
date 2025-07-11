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
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    stageName: z.string().optional().nullable(),
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
      <ProfileForm
        currentFirstName="Initial"
        currentLastName="Name"
        currentBio="Initial Bio"
        {...props}
      />
    );
  };

  it('renders with initial values', () => {
    renderComponent();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('Initial');
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Name');
    expect(screen.getByLabelText(/Bio/i)).toHaveValue('Initial Bio');
  });

  it('allows typing in fields', () => {
    renderComponent();
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const bioInput = screen.getByLabelText(/Bio/i);

    fireEvent.change(firstNameInput, { target: { value: 'New First' } });
    fireEvent.change(lastNameInput, { target: { value: 'New Last' } });
    fireEvent.change(bioInput, { target: { value: 'New Bio' } });

    expect(firstNameInput).toHaveValue('New First');
    expect(lastNameInput).toHaveValue('New Last');
    expect(bioInput).toHaveValue('New Bio');
  });

  it('calls updateUserProfile with form data on submit and shows success', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: true,
      message: 'Profile updated!',
      user: {
        id: '1',
        firstName: 'Updated First',
        lastName: 'Updated Last',
        bio: 'Updated Bio',
        email: 'test@test.com',
        image: null,
      },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Updated First' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Updated Last' },
    });
    fireEvent.change(screen.getByLabelText(/Bio/i), {
      target: { value: 'Updated Bio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        firstName: 'Updated First',
        lastName: 'Updated Last',
        stageName: '', // Assuming stage name is optional and empty
        bio: 'Updated Bio',
      });
    });
    expect(await screen.findByText('Profile updated!')).toBeInTheDocument();
    // Form should reset to new values
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('Updated First');
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Updated Last');
    expect(screen.getByLabelText(/Bio/i)).toHaveValue('Updated Bio');
  });

  it('shows server error message on failed update', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: false,
      error: 'Update failed on server',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Bad First' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });
    expect(
      await screen.findByText('Update failed on server')
    ).toBeInTheDocument();
    // Form should not reset
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('Bad First');
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
    fireEvent.change(screen.getByLabelText(/First Name/i), {
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
      firstName: 'Callback First',
      lastName: 'Callback Last',
      stageName: '',
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

    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Callback First' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Callback Last' },
    });
    fireEvent.change(screen.getByLabelText(/Bio/i), {
      target: { value: 'Callback Bio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockOnProfileUpdate).toHaveBeenCalledWith({
        firstName: 'Callback First',
        lastName: 'Callback Last',
        stageName: '',
        bio: 'Callback Bio',
      });
    });
  });
}); 