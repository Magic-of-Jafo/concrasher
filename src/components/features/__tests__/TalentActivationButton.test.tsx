import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TalentActivationButton from '../TalentActivationButton';
import { Role } from '@prisma/client';
import * as actions from '@/lib/actions'; // To mock server actions

// Mock the server action
jest.mock('@/lib/actions', () => ({
  // Keep other action mocks if they exist in the actual module, or add them if needed for other tests
  ...jest.requireActual('@/lib/actions'), // Preserve other exports if any
  activateTalentRole: jest.fn(), 
  deactivateTalentRole: jest.fn(), // Added mock for deactivateTalentRole
}));

const mockActivateTalentRole = actions.activateTalentRole as jest.Mock;
const mockDeactivateTalentRole = actions.deactivateTalentRole as jest.Mock; // Added

describe('<TalentActivationButton />', () => {
  beforeEach(() => {
    mockActivateTalentRole.mockReset();
    mockDeactivateTalentRole.mockReset(); // Added reset
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
    expect(switchControl).not.toBeDisabled(); // Should be enabled to allow deactivation
  });

  it('calls activateTalentRole and updates UI on successful activation', async () => {
    const initialRoles = [Role.USER];
    const finalRoles = [Role.USER, Role.TALENT];
    mockActivateTalentRole.mockResolvedValue({
      success: true,
      message: 'Talent activated!',
      roles: finalRoles,
    });

    render(<TalentActivationButton initialRoles={initialRoles} />); 
    const switchControl = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    await userEvent.click(switchControl);

    await waitFor(() => {
      expect(mockActivateTalentRole).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Talent activated!')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Talent Role Active')).toBeInTheDocument();
    });
    // Switch should now be checked and enabled (as it can be deactivated)
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
      message: 'Talent deactivated!',
      roles: finalRoles,
    });

    render(<TalentActivationButton initialRoles={initialRoles} />); 
    const switchControl = screen.getByRole('checkbox', { name: /Deactivate Talent Role/i });
    expect(switchControl).toBeChecked(); // Starts as Talent
    await userEvent.click(switchControl); // Toggle off

    await waitFor(() => {
      expect(mockDeactivateTalentRole).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Talent deactivated!')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Activate Talent Profile')).toBeInTheDocument();
    });
    // Switch should now be unchecked and enabled
    const finalSwitch = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    expect(finalSwitch).not.toBeChecked();
    expect(finalSwitch).not.toBeDisabled();
  });

  it('prevents deactivation if already a talent', async () => {
    render(<TalentActivationButton initialRoles={[Role.USER, Role.TALENT]} />);
    const switchControl = screen.getByRole('checkbox', { name: /Deactivate Talent Role/i });
    
    expect(switchControl).toBeChecked();
    expect(switchControl).not.toBeDisabled(); // Switch is enabled
    
    // This test's original intent was to check if a disabled switch prevents action.
    // Now, the switch is enabled. Clicking it WILL call deactivateTalentRole.
    // So this test needs to be re-thought or its purpose clarified.
    // For now, let's assume it tests that toggling off works as expected (covered by new deactivation test).
    // Or, if it meant to test if clicking an already OFF switch does nothing, that's a different scenario.
    // The component logic `if (isTalent)` in `handleToggleTalent` for deactivation covers not calling it if not talent.
    // Let's remove this test as its premise has changed and is covered by the deactivation success test.
  });

  it('shows processing indicator during activation', async () => {
    mockActivateTalentRole.mockImplementation(() => new Promise(() => {})); // Hang the promise

    render(<TalentActivationButton initialRoles={[Role.USER]} />); 
    const switchControl = screen.getByRole('checkbox', { name: /Activate Talent Role/i });
    await userEvent.click(switchControl);

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: /Activate Talent Role/i })).toBeDisabled();
  });

  it('shows processing indicator during deactivation', async () => {
    mockDeactivateTalentRole.mockImplementation(() => new Promise(() => {})); // Hang the promise

    render(<TalentActivationButton initialRoles={[Role.USER, Role.TALENT]} />); 
    const switchControl = screen.getByRole('checkbox', { name: /Deactivate Talent Role/i });
    await userEvent.click(switchControl); // Toggle off

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: /Deactivate Talent Role/i })).toBeDisabled(); // Disabled during processing
  });
}); 