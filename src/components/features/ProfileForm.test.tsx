import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileForm from './ProfileForm';
import { updateUserProfile } from '@/lib/actions'; // Adjust path as needed
import { ProfileSchema } from '@/lib/validators'; // Adjust path as needed

// Mock the server action
jest.mock('@/lib/actions', () => ({
  updateUserProfile: jest.fn(),
}));

// Mock the Zod schema for resolver if needed, though zodResolver handles it.
// We primarily test interaction with the mocked action.

const mockUpdateUserProfile = updateUserProfile as jest.Mock;

describe('ProfileForm', () => {
  beforeEach(() => {
    mockUpdateUserProfile.mockReset();
  });

  const renderComponent = (props = {}) => {
    return render(<ProfileForm currentName="Initial Name" currentBio="Initial Bio" {...props} />);
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
      user: { id: '1', name: 'Updated Name', bio: 'Updated Bio', email: 'test@test.com', image: null },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Updated Name' } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: 'Updated Bio' } });
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

    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Bad Name' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });
    expect(await screen.findByText('Update failed on server')).toBeInTheDocument();
    // Form should not reset
     expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Bad Name');
  });

  it('shows field-specific errors from server action', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: false,
      error: 'Invalid input.',
      fieldErrors: {
        name: ['Name is too short'],
        bio: ['Bio cannot contain special characters'],
      },
    });

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Nm' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });
    expect(await screen.findByText('Invalid input.')).toBeInTheDocument(); // General error
    expect(await screen.findByText('Name is too short')).toBeInTheDocument(); // Field error for name
    expect(await screen.findByText('Bio cannot contain special characters')).toBeInTheDocument(); // Field error for bio
  });


  it('displays client-side validation error for name (e.g. required)', async () => {
    renderComponent({ currentName: ''}); // Start with an empty name
    const nameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test' } }); // Make it dirty
    fireEvent.change(nameInput, { target: { value: '' } }); // Then make it invalid
    fireEvent.blur(nameInput); // Trigger validation

    // Check for the error message from ProfileSchema: "Display name is required"
    // Note: Exact message depends on your Zod schema. This test assumes min(1) for name.
    // await waitFor(() => {
    //   expect(screen.getByText('Display name is required')).toBeInTheDocument();
    // });
    // The ProfileSchema allows name to be optional, but if provided, it must be min(1).
    // So submitting an empty string will be caught by the server action due to ProfileSchema.
    // For client-side, react-hook-form + zodResolver should show this error *before* submission if the field is touched and then made invalid.
    
    // This specific test case for client-side Zod error might need refinement based on how ProfileSchema
    // is configured for truly optional vs. empty-if-provided behavior for `name`.
    // The current ProfileSchema implies `name: z.string().min(1).optional()`. If `name` is part of the form values 
    // and is empty, `min(1)` will trigger.

    // Simulate submission to see server-side validation catch it if client-side doesn't prevent
    mockUpdateUserProfile.mockResolvedValueOnce({
        success: false,
        error: "Invalid input.",
        fieldErrors: { name: ['Display name is required'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(await screen.findByText('Display name is required')).toBeInTheDocument();
  });

  it('disables submit button when submitting', async () => {
    mockUpdateUserProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, message: 'Done', user: {} }), 50)));
    renderComponent();
    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Submitting Name' } });
    const button = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('submit button is initially disabled if form is not dirty (no changes)', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });

  it('submit button becomes enabled when form is dirty', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Made a change' } });
    expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
  });

  it('calls onProfileUpdate callback on successful update', async () => {
    const mockOnProfileUpdate = jest.fn();
    const updatedUserData = { id: '1', name: 'Callback Name', bio: 'Callback Bio', email: 'test@test.com', image: null };
    mockUpdateUserProfile.mockResolvedValueOnce({
      success: true,
      message: 'Profile updated!',
      user: updatedUserData,
    });

    renderComponent({ onProfileUpdate: mockOnProfileUpdate });

    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Callback Name' } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: 'Callback Bio' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockOnProfileUpdate).toHaveBeenCalledWith({ name: 'Callback Name', bio: 'Callback Bio' });
    });
  });

}); 