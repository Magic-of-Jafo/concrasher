import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import ScheduleEventForm from './ScheduleEventForm';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

// Mocking the SessionProvider
const mockSession: Session = {
    user: { id: 'test-user-id' },
    expires: new Date(Date.now() + 2 * 86400 * 1000).toISOString(),
};

const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <SessionProvider session={mockSession}>
            {ui}
        </SessionProvider>
    );
};

describe('ScheduleEventForm', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() =>
            Promise.resolve(new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }))
        ) as jest.Mock;
    });

    it('renders and functions correctly', async () => {
        const onSave = jest.fn();
        const onClose = jest.fn();

        renderWithProviders(
            <ScheduleEventForm
                open={true}
                onClose={onClose}
                item={{ eventType: 'Panel' }}
                conventionId="test-convention-id"
                onSave={onSave}
                forceCreateNew={true}
            />
        );

        // 1. Initial render check
        expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
        expect(screen.getByLabelText("Event is at Primary Venue")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

        // 2. Test fee tier visibility toggle
        const noFeeSwitch = screen.getByLabelText(/no additional fees for this event/i);
        expect(screen.queryByText(/add tier/i)).not.toBeInTheDocument();
        fireEvent.click(noFeeSwitch);
        expect(await screen.findByText(/add tier/i)).toBeInTheDocument();
        fireEvent.click(noFeeSwitch);
        await waitFor(() => {
            expect(screen.queryByText(/add tier/i)).not.toBeInTheDocument();
        });

        // 3. Test secondary venue visibility toggle
        const primaryVenueSwitch = screen.getByLabelText("Event is at Primary Venue");

        // Initially, the switch is on and the dropdown is not visible
        expect(primaryVenueSwitch).toBeChecked();
        expect(screen.queryByRole('combobox', { name: /select secondary venue or hotel/i })).not.toBeInTheDocument();

        // Click the switch to turn it OFF, dropdown should appear
        fireEvent.click(primaryVenueSwitch);
        expect(primaryVenueSwitch).not.toBeChecked();
        expect(await screen.findByRole('combobox', { name: /select secondary venue or hotel/i })).toBeInTheDocument();

        // Click the switch to turn it ON again, dropdown should disappear
        fireEvent.click(primaryVenueSwitch);
        expect(primaryVenueSwitch).toBeChecked();
        await waitFor(() => {
            expect(screen.queryByRole('combobox', { name: /select secondary venue or hotel/i })).not.toBeInTheDocument();
        });
    });
});
