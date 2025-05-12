'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';

interface RoleApplication {
  id: string;
  userId: string;
  role: Role;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminRoleApplicationsPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications on component mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch('/api/admin/applications');
        if (!response.ok) throw new Error('Failed to fetch applications');
        const data = await response.json();
        setApplications(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleApplication = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} application`);

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
            : app
        )
      );
    } catch (err) {
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
                      <span className="font-medium">Role:</span> {application.role}
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