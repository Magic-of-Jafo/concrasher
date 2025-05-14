'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import { useSession } from 'next-auth/react';
import { Role, RequestedRole } from '@prisma/client';

interface RoleApplication {
  id: string;
  userId: string;
  requestedRole: RequestedRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminRoleApplicationsPage() {
  const { data: session, update: updateSession } = useSession();
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications on component mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        console.log('Fetching applications...'); // Debug log
        const response = await fetch('/api/admin/applications');
        console.log('Response status:', response.status); // Debug log
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response:', errorData); // Debug log
          throw new Error(errorData.error || 'Failed to fetch applications');
        }
        
        const data = await response.json();
        console.log('Fetched applications:', JSON.stringify(data, null, 2)); // Debug log
        setApplications(data);
      } catch (err) {
        console.error('Error in fetchApplications:', err); // Debug log
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleApplication = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      setError(null); // Clear any previous errors
      console.log(`Starting ${action} for application:`, applicationId);
      
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || `Failed to ${action} application`);
      }

      if (!data.success) {
        console.error('Operation failed:', data);
        throw new Error('Operation failed');
      }

      console.log('Updating UI with new application status:', data.application.status);
      // Update local state with the returned application data
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status: data.application.status }
            : app
        )
      );

      // If approved, trigger a session update
      if (action === 'approve') {
        console.log('Triggering session update');
        // Force a session update by calling updateSession
        await updateSession();
        console.log('Session update triggered');
      }
    } catch (err) {
      console.error('Error handling application:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Role Applications</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div>Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="text-gray-600">No pending applications</div>
        ) : (
          <div data-testid="applications-list" className="grid gap-4">
            {applications.map(application => (
              <div
                key={application.id}
                className="bg-white p-6 rounded-lg shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{application.user.name}</h3>
                    <p className="text-gray-600">{application.user.email}</p>
                    <p className="mt-2">
                      <span className="font-medium">Role:</span> {application.requestedRole}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span
                        className={`${
                          application.status === 'APPROVED'
                            ? 'text-green-600'
                            : application.status === 'REJECTED'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {application.status}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Applied on: {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {application.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplication(application.id, 'approve')}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApplication(application.id, 'reject')}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
} 