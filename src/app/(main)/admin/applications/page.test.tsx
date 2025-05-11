'use client'; // This test file will run in a Node environment with JSDOM

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminRoleApplicationsPage from './page'; // Adjust path as necessary
import * as actions from '@/lib/actions'; // Import actions to mock
import { ApplicationStatus, RequestedRole } from '@prisma/client';

// Mock the server actions
jest.mock('@/lib/actions', () => ({
  getPendingOrganizerApplicationsAction: jest.fn(),
  reviewOrganizerApplication: jest.fn(),
}));

// Type mocks for easier usage
const mockGetPendingApplications = actions.getPendingOrganizerApplicationsAction as jest.Mock;
const mockReviewApplication = actions.reviewOrganizerApplication as jest.Mock;

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

describe('AdminRoleApplicationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful fetch
    mockGetPendingApplications.mockResolvedValue({ success: true, applications: [] });
    // Default successful review
    mockReviewApplication.mockResolvedValue({ success: true, message: 'Action successful' });
  });

  it('should display loading state initially', () => {
    mockGetPendingApplications.mockImplementation(() => new Promise(() => {})); // Keep it pending
    render(<AdminRoleApplicationsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display "No pending applications" when no applications are fetched', async () => {
    render(<AdminRoleApplicationsPage />);
    await waitFor(() => {
      expect(screen.getByText('No pending organizer applications.')).toBeInTheDocument();
    });
  });

  it('should display an error message if fetching applications fails', async () => {
    mockGetPendingApplications.mockResolvedValue({ success: false, error: 'Fetch failed' });
    render(<AdminRoleApplicationsPage />);
    await waitFor(() => {
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });
  });

  it('should display a list of applications', async () => {
    const apps = [
      createMockApplication('app1', 'User One', 'one@example.com'),
      createMockApplication('app2', 'User Two', 'two@example.com'),
    ];
    mockGetPendingApplications.mockResolvedValue({ success: true, applications: apps });
    render(<AdminRoleApplicationsPage />);
    await waitFor(() => {
      expect(screen.getByText('User One (one@example.com)')).toBeInTheDocument();
      expect(screen.getByText('User Two (two@example.com)')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  it('should call reviewOrganizerApplication with APPROVE when Approve button is clicked', async () => {
    const app1 = createMockApplication('app1', 'User One', 'one@example.com');
    mockGetPendingApplications.mockResolvedValue({ success: true, applications: [app1] });
    render(<AdminRoleApplicationsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('User One (one@example.com)')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockReviewApplication).toHaveBeenCalledWith(app1.id, 'APPROVED');
    });
  });

  it('should call reviewOrganizerApplication with REJECT when Reject button is clicked', async () => {
    const app1 = createMockApplication('app1', 'User One', 'one@example.com');
    mockGetPendingApplications.mockResolvedValue({ success: true, applications: [app1] });
    render(<AdminRoleApplicationsPage />);

    await waitFor(() => {
      expect(screen.getByText('User One (one@example.com)')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockReviewApplication).toHaveBeenCalledWith(app1.id, 'REJECTED');
    });
  });

  it('should refresh applications and show success message on successful review', async () => {
    const app1 = createMockApplication('app1', 'User One', 'one@example.com');
    mockGetPendingApplications.mockResolvedValueOnce({ success: true, applications: [app1] }); // Initial fetch
    
    // Second fetch after review (e.g., approved app is gone)
    mockGetPendingApplications.mockResolvedValueOnce({ success: true, applications: [] }); 
    mockReviewApplication.mockResolvedValue({ success: true, message: 'Application Approved!' });

    render(<AdminRoleApplicationsPage />);
    await waitFor(() => expect(screen.getByText('User One (one@example.com)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText('Application Approved!')).toBeInTheDocument();
    });
    await waitFor(() => {
        // List should be empty now
      expect(screen.getByText('No pending organizer applications.')).toBeInTheDocument();
    });
    expect(mockGetPendingApplications).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it('should show an error message if review action fails', async () => {
    const app1 = createMockApplication('app1', 'User One', 'one@example.com');
    mockGetPendingApplications.mockResolvedValue({ success: true, applications: [app1] });
    mockReviewApplication.mockResolvedValue({ success: false, message: 'Review Failed Miserably' });

    render(<AdminRoleApplicationsPage />);
    await waitFor(() => expect(screen.getByText('User One (one@example.com)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText('Review Failed Miserably')).toBeInTheDocument();
    });
    // Ensure list doesn't refresh if action fails and no optimistic update shown
    expect(mockGetPendingApplications).toHaveBeenCalledTimes(1); 
  });

}); 