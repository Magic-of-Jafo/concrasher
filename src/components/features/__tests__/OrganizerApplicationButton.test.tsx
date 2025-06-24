import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OrganizerApplicationButton from '../OrganizerApplicationButton';
import { Role, ApplicationStatus } from '@prisma/client';
import * as actions from '@/lib/actions'; // To mock server actions

// Mock the server action
jest.mock('@/lib/actions', () => ({
  applyForOrganizerRole: jest.fn(),
}));

const mockApplyForOrganizerRole = actions.applyForOrganizerRole as jest.Mock;

describe('<OrganizerApplicationButton />', () => {
  beforeEach(() => {
    mockApplyForOrganizerRole.mockReset();
  });

  it('shows "Organizer role is active" if user is already an ORGANIZER', () => {
    render(<OrganizerApplicationButton currentRoles={[Role.ORGANIZER]} />);
    expect(screen.getByText('Organizer role is active.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows "Organizer Application Pending" button if an application is PENDING', () => {
    render(
      <OrganizerApplicationButton
        currentRoles={[Role.USER]}
        existingApplicationStatus={ApplicationStatus.PENDING}
      />
    );
    const button = screen.getByRole('button', { name: /Organizer Application Pending/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows "Organizer Application Approved" button if an application is APPROVED', () => {
    render(
      <OrganizerApplicationButton
        currentRoles={[Role.USER]} // User does not have ORGANIZER role yet
        existingApplicationStatus={ApplicationStatus.APPROVED}
      />
    );
    const button = screen.getByRole('button', { name: /Organizer Application Approved/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows "Apply for Organizer Role" button for eligible user (no existing application)', () => {
    render(<OrganizerApplicationButton currentRoles={[Role.USER]} />);
    const button = screen.getByRole('button', { name: /Apply for Organizer Role/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('shows "Apply for Organizer Role" button for eligible user (REJECTED application)', () => {
    render(
      <OrganizerApplicationButton
        currentRoles={[Role.USER]}
        existingApplicationStatus={ApplicationStatus.REJECTED}
      />
    );
    const button = screen.getByRole('button', { name: /Apply for Organizer Role/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled(); // Assuming re-application is allowed for REJECTED
  });

  it('calls applyForOrganizerRole and shows success message on successful application', async () => {
    mockApplyForOrganizerRole.mockResolvedValue({
      success: true,
      message: 'Application submitted!',
      applicationStatus: ApplicationStatus.PENDING,
    });
    render(<OrganizerApplicationButton currentRoles={[Role.USER]} />);
    
    const applyButton = screen.getByRole('button', { name: /Apply for Organizer Role/i });
    await userEvent.click(applyButton);

    await waitFor(() => {
      expect(mockApplyForOrganizerRole).toHaveBeenCalledTimes(1);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Application submitted!')).toBeInTheDocument();
    });
    // Button should now be disabled and show pending status
    await waitFor(() => {
        const pendingButton = screen.getByRole('button', { name: /Organizer Application Pending/i });
        expect(pendingButton).toBeInTheDocument();
        expect(pendingButton).toBeDisabled();
    });
  });

  it('calls applyForOrganizerRole and shows error message on failed application', async () => {
    mockApplyForOrganizerRole.mockResolvedValue({
      success: false,
      error: 'Submission failed.',
    });
    render(<OrganizerApplicationButton currentRoles={[Role.USER]} />);
    
    const applyButton = screen.getByRole('button', { name: /Apply for Organizer Role/i });
    await userEvent.click(applyButton);

    await waitFor(() => {
      expect(mockApplyForOrganizerRole).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Submission failed.')).toBeInTheDocument();
    });
    // Button should still be enabled for another attempt
    expect(screen.getByRole('button', { name: /Apply for Organizer Role/i })).not.toBeDisabled();
  });

   it('disables button during submission and shows "Submitting..." text', async () => {
    // Make the promise hang so we can check the loading state
    mockApplyForOrganizerRole.mockImplementation(() => new Promise(() => {})); 

    render(<OrganizerApplicationButton currentRoles={[Role.USER]} />);
    const applyButton = screen.getByRole('button', { name: /Apply for Organizer Role/i });
    
    await userEvent.click(applyButton); // No await here for the click itself if the action hangs

    // Check immediately after click (or within a short waitFor if needed for state to settle)
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submitting.../i })).toBeDisabled();
    });
  });
}); 