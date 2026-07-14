import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TalentActivationButton from '../TalentActivationButton';
import * as actions from '@/lib/actions';

// Mock the server actions the component calls.
jest.mock('@/lib/actions', () => ({
  activateTalentProfile: jest.fn(),
  deactivateTalentProfile: jest.fn(),
}));

const mockActivate = actions.activateTalentProfile as jest.Mock;
const mockDeactivate = actions.deactivateTalentProfile as jest.Mock;

describe('TalentActivationButton', () => {
  beforeEach(() => {
    mockActivate.mockReset();
    mockDeactivate.mockReset();
  });

  it('renders "Activate Talent Profile" with the switch off when inactive', () => {
    render(<TalentActivationButton initialIsActive={false} hasTalentProfile={false} />);
    expect(screen.getByText('Activate Talent Profile')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Activate Talent Profile' })).not.toBeChecked();
  });

  it('renders "Talent Profile Active" with the switch on when active', () => {
    render(<TalentActivationButton initialIsActive={true} hasTalentProfile={true} />);
    expect(screen.getByText('Talent Profile Active')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Deactivate Talent Profile' })).toBeChecked();
  });

  it('activates directly (no confirmation) when toggled on', async () => {
    mockActivate.mockResolvedValue({ success: true, isActive: true, message: 'Talent profile activated!' });
    render(<TalentActivationButton initialIsActive={false} hasTalentProfile={true} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Activate Talent Profile' }));

    await waitFor(() => expect(mockActivate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Talent Profile Active')).toBeInTheDocument();
  });

  it('does NOT deactivate immediately — it opens a warning dialog first', async () => {
    render(<TalentActivationButton initialIsActive={true} hasTalentProfile={true} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Deactivate Talent Profile' }));

    // Warning shown; no server call yet; switch stays on.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/hides your Talent profile from fans and organizers/i)).toBeInTheDocument();
    expect(mockDeactivate).not.toHaveBeenCalled();
    // The switch sits behind the modal (aria-hidden), so include hidden nodes.
    expect(screen.getByRole('checkbox', { name: 'Deactivate Talent Profile', hidden: true })).toBeChecked();
  });

  it('cancelling the dialog keeps the profile active and makes no server call', async () => {
    render(<TalentActivationButton initialIsActive={true} hasTalentProfile={true} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Deactivate Talent Profile' }));
    await userEvent.click(await screen.findByRole('button', { name: /Keep it visible/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDeactivate).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Deactivate Talent Profile' })).toBeChecked();
  });

  it('confirming the dialog deactivates and flips the switch off', async () => {
    mockDeactivate.mockResolvedValue({ success: true, isActive: false, message: 'Talent profile deactivated.' });
    render(<TalentActivationButton initialIsActive={true} hasTalentProfile={true} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Deactivate Talent Profile' }));
    await userEvent.click(await screen.findByRole('button', { name: /Hide Talent profile/i }));

    await waitFor(() => expect(mockDeactivate).toHaveBeenCalledTimes(1));
    // findByRole retries while the dialog finishes closing (background un-hides).
    const sw = await screen.findByRole('checkbox', { name: 'Activate Talent Profile' });
    expect(sw).not.toBeChecked();
  });
});
