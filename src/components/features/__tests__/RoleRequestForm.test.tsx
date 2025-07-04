import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleRequestForm from '../RoleRequestForm';
import { requestRoles } from '@/lib/actions';
import { Role, ApplicationStatus, RequestedRole } from '@prisma/client';

// Mock the server action
jest.mock('@/lib/actions', () => ({
    requestRoles: jest.fn(),
}));

const mockRequestRoles = requestRoles as jest.Mock;

describe('RoleRequestForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders checkboxes for available roles', () => {
        render(<RoleRequestForm currentRoles={[]} existingApplications={[]} />);
        expect(screen.getByLabelText(/Apply for ORGANIZER/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Apply for BRAND CREATOR/i)).toBeInTheDocument();
    });

    it('disables checkbox if user already has the role', () => {
        render(<RoleRequestForm currentRoles={[Role.ORGANIZER]} existingApplications={[]} />);
        const organizerCheckbox = screen.getByLabelText(/You are already a ORGANIZER/i);
        expect(organizerCheckbox).toBeInTheDocument();
        expect(organizerCheckbox).toBeDisabled();
    });

    it('disables checkbox if an application is pending', () => {
        const existingApplications = [
            { requestedRole: RequestedRole.ORGANIZER, status: ApplicationStatus.PENDING },
        ];
        render(<RoleRequestForm currentRoles={[]} existingApplications={existingApplications} />);
        const organizerCheckbox = screen.getByLabelText(/ORGANIZER application is pending/i);
        expect(organizerCheckbox).toBeInTheDocument();
        expect(organizerCheckbox).toBeDisabled();
    });

    it('calls requestRoles with selected roles on submit', async () => {
        mockRequestRoles.mockResolvedValue({ success: true });
        render(<RoleRequestForm currentRoles={[]} existingApplications={[]} />);

        fireEvent.click(screen.getByLabelText(/Apply for BRAND CREATOR/i));
        fireEvent.click(screen.getByRole('button', { name: /Submit Request/i }));

        await waitFor(() => {
            expect(mockRequestRoles).toHaveBeenCalledWith([RequestedRole.BRAND_CREATOR]);
        });
    });

    it('shows an error message if the server action fails', async () => {
        mockRequestRoles.mockResolvedValue({ success: false, error: 'Something went wrong' });
        render(<RoleRequestForm currentRoles={[]} existingApplications={[]} />);

        fireEvent.click(screen.getByLabelText(/Apply for ORGANIZER/i));
        fireEvent.click(screen.getByRole('button', { name: /Submit Request/i }));

        expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    });
}); 