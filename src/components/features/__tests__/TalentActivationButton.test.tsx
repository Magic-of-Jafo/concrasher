import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TalentActivationButton from '../TalentActivationButton';
import { Role } from '@prisma/client';
import * as actions from '@/lib/actions'; // To mock server actions

// Mock the server action
jest.mock('@/lib/actions', () => ({
  activateTalentRole: jest.fn(),
  deactivateTalentRole: jest.fn(),
}));

const mockActivateTalentRole = actions.activateTalentRole as jest.Mock;
const mockDeactivateTalentRole = actions.deactivateTalentRole as jest.Mock;

describe('TalentActivationButton', () => {
  beforeEach(() => {
    mockActivateTalentRole.mockReset();
    mockDeactivateTalentRole.mockReset();
  });

  it('renders with "Activate Talent Profile" and switch off for non-talent user', () => {
    render(<TalentActivationButton initialRoles={[Role.USER]} />);
    expect(screen.getByText('Activate Talent Profile')).toBeInTheDocument();
    const switchControl = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    expect(switchControl).not.toBeChecked();
    expect(switchControl).not.toBeDisabled();
  });

  it('renders with "Talent Role Active" and switch on and enabled for talent user (can deactivate)', () => {
    render(<TalentActivationButton initialRoles={[Role.USER, Role.TALENT]} />);
    expect(screen.getByText('Talent Role Active')).toBeInTheDocument();
    const switchControl = screen.getByRole('checkbox', { name: /Deactivate Talent Role/i }); // Aria label changes
    expect(switchControl).toBeChecked();
    expect(switchControl).not.toBeDisabled();
  });

  it('calls activateTalentRole and updates UI on successful activation', async () => {
    const initialRoles = [Role.USER];
    const finalRoles = [Role.USER, Role.TALENT];
    mockActivateTalentRole.mockResolvedValue({
      success: true,
      message: 'Talent role has been activated successfully!',
      roles: finalRoles,
    });

    render(<TalentActivationButton initialRoles={initialRoles} />);
    const switchControl = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    await userEvent.click(switchControl);

    await waitFor(() => {
      expect(mockActivateTalentRole).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Talent role has been activated successfully!')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Talent Role Active')).toBeInTheDocument();
    });
    // Switch should now be checked and enabled
    expect(screen.getByRole('checkbox', { name: /Deactivate Talent Role/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Deactivate Talent Role/i })).not.toBeDisabled();
  });

  it('calls activateTalentRole and shows error message on failed activation', async () => {
    mockActivateTalentRole.mockResolvedValue({
      success: false,
      error: 'Activation failed.',
      roles: [Role.USER], // Role remains unchanged
    });

    render(<TalentActivationButton initialRoles={[Role.USER]} />);
    const switchControl = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    await userEvent.click(switchControl);

    await waitFor(() => {
      expect(mockActivateTalentRole).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Activation failed.')).toBeInTheDocument();
    });
    // Switch should remain unchecked and enabled
    expect(screen.getByRole('checkbox', { name: /Activate Talent Role/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Activate Talent Role/i })).not.toBeDisabled();
  });

  it('calls deactivateTalentRole and updates UI on successful deactivation', async () => {
    const initialRoles = [Role.USER, Role.TALENT];
    const finalRoles = [Role.USER];
    mockDeactivateTalentRole.mockResolvedValue({
      success: true,
      message: 'Talent role has been deactivated successfully.',
      roles: finalRoles,
    });

    render(<TalentActivationButton initialRoles={initialRoles} />);
    const switchControl = screen.getByRole('checkbox', { name: /Deactivate Talent Role/i });
    expect(switchControl).toBeChecked();
    await userEvent.click(switchControl); // Toggle off

    await waitFor(() => {
      expect(mockDeactivateTalentRole).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Talent role has been deactivated successfully.')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Activate Talent Profile')).toBeInTheDocument();
    });
    // Switch should now be unchecked and enabled
    const finalSwitch = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    expect(finalSwitch).not.toBeChecked();
    expect(finalSwitch).not.toBeDisabled();
  });

  it('shows disabled switch during activation', async () => {
    mockActivateTalentRole.mockImplementation(() => new Promise(() => { })); // Simulate pending promise

    render(<TalentActivationButton initialRoles={[Role.USER]} />);
    const switchControl = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    await userEvent.click(switchControl);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Activate Talent Role/i })).toBeDisabled();
    });
  });

  it('shows disabled switch during deactivation', async () => {
    mockDeactivateTalentRole.mockImplementation(() => new Promise(() => { })); // Simulate pending promise

    render(<TalentActivationButton initialRoles={[Role.USER, Role.TALENT]} />);
    const switchControl = screen.getByRole('checkbox', { name: /Deactivate Talent Role/i });
    await userEvent.click(switchControl); // Toggle off

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Deactivate Talent Role/i })).toBeDisabled();
    });
  });
});
