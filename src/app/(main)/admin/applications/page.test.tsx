'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionProvider } from 'next-auth/react';
import AdminRoleApplicationsPage from './page';
import { ApplicationStatus, RequestedRole, Role } from '@prisma/client';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
    ...jest.requireActual('next-auth/react'),
    useSession: jest.fn(),
}));

// Mock the AdminGuard component
jest.mock('@/components/auth/AdminGuard', () => {
    return function MockAdminGuard({ children }: { children: React.ReactNode }) {
        return <>{children}</>;
    };
});

// Mock fetch
global.fetch = jest.fn();

const mockUseSession = require('next-auth/react').useSession as jest.Mock;

// Mock session data
const mockSession = {
    user: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        name: 'Admin User',
        roles: [Role.USER, Role.ADMIN],
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
};

// Helper to provide basic application data
const createMockApplication = (id: string, name: string, email: string, status = ApplicationStatus.PENDING) => ({
    id,
    userId: `user-${id}`,
    requestedRole: RequestedRole.ORGANIZER,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: { id: `user-${id}`, name, email },
});

// Wrapper component to provide session context
const renderWithSession = (component: React.ReactElement) => {
    return render(
        <SessionProvider session={mockSession}>
            {component}
        </SessionProvider>
    );
};

describe('AdminRoleApplicationsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock useSession to return admin session
        mockUseSession.mockReturnValue({
            data: mockSession,
            status: 'authenticated',
            update: jest.fn(),
        });

        // Mock fetch to return empty applications by default
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
    });

    it('should display loading state initially', () => {
        // Mock fetch to never resolve
        (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => { }));

        renderWithSession(<AdminRoleApplicationsPage />);
        expect(screen.getByText('Loading applications...')).toBeInTheDocument();
    });

    it('should display "No pending applications" when no applications are fetched', async () => {
        renderWithSession(<AdminRoleApplicationsPage />);
        await waitFor(() => {
            expect(screen.getByText('No pending applications')).toBeInTheDocument();
        });
    });

    it('should display an error message if fetching applications fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: 'Fetch failed' }),
        });

        renderWithSession(<AdminRoleApplicationsPage />);
        await waitFor(() => {
            expect(screen.getByText('Fetch failed')).toBeInTheDocument();
        });
    });

    it('should display a list of applications', async () => {
        const apps = [
            createMockApplication('app1', 'User One', 'one@example.com'),
            createMockApplication('app2', 'User Two', 'two@example.com'),
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(apps),
        });

        renderWithSession(<AdminRoleApplicationsPage />);
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
            expect(screen.getByText('User Two')).toBeInTheDocument();
        });
    });

    it('should call reviewOrganizerApplication with APPROVE when Approve button is clicked', async () => {
        const app1 = createMockApplication('app1', 'User One', 'one@example.com');

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([app1]),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, application: { ...app1, status: 'APPROVED' } }),
            });

        renderWithSession(<AdminRoleApplicationsPage />);

        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });

        const approveButton = screen.getByRole('button', { name: /approve/i });
        fireEvent.click(approveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/applications/app1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            });
        });
    });

    it('should call reviewOrganizerApplication with REJECT when Reject button is clicked', async () => {
        const app1 = createMockApplication('app1', 'User One', 'one@example.com');

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([app1]),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, application: { ...app1, status: 'REJECTED' } }),
            });

        renderWithSession(<AdminRoleApplicationsPage />);

        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });

        const rejectButton = screen.getByRole('button', { name: /reject/i });
        fireEvent.click(rejectButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/applications/app1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' }),
            });
        });
    });

    it('should refresh applications and show success message on successful review', async () => {
        const app1 = createMockApplication('app1', 'User One', 'one@example.com');

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([app1]),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, application: { ...app1, status: 'APPROVED' } }),
            });

        renderWithSession(<AdminRoleApplicationsPage />);
        await waitFor(() => expect(screen.getByText('User One')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /approve/i }));

        await waitFor(() => {
            expect(screen.getByText('APPROVED')).toBeInTheDocument();
        });
    });

    it('should show an error message if review action fails', async () => {
        const app1 = createMockApplication('app1', 'User One', 'one@example.com');

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([app1]),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: 'Review Failed Miserably' }),
            });

        renderWithSession(<AdminRoleApplicationsPage />);
        await waitFor(() => expect(screen.getByText('User One')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /approve/i }));

        await waitFor(() => {
            expect(screen.getByText('Review Failed Miserably')).toBeInTheDocument();
        });
    });
}); 