'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import type { ApplicationWithUser } from '@/types/applications';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load applications on mount
  useEffect(() => {
    const loadApplications = async () => {
      try {
        const response = await fetch('/api/admin/applications');
        if (!response.ok) {
          throw new Error('Failed to load applications');
        }
        const data = await response.json();
        setApplications(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    loadApplications();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          applicationId: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve application');
      }

      const updatedApplication = await response.json();
      setApplications(prev => 
        prev.map(app => app.id === id ? updatedApplication : app)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve application');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          applicationId: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject application');
      }

      const updatedApplication = await response.json();
      setApplications(prev => 
        prev.map(app => app.id === id ? updatedApplication : app)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject application');
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="container mx-auto px-4 py-8">
          <p>Loading applications...</p>
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <div className="container mx-auto px-4 py-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Role Applications</h1>
        
        <div data-testid="applications-list" className="space-y-4">
          {applications.map((application) => (
            <div 
              key={application.id} 
              data-testid="application-card"
              className="bg-white p-6 rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{application.user.name}</h3>
                  <p className="text-gray-600">{application.user.email}</p>
                  <p className="mt-2">
                    <span className="font-medium">Requested Role:</span> {application.requestedRole}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`px-2 py-1 rounded text-sm ${
                      application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {application.status}
                    </span>
                  </p>
                </div>
                {application.status === 'PENDING' && (
                  <div className="space-x-2">
                    <button
                      onClick={() => handleApprove(application.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(application.id)}
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
      </div>
    </AdminGuard>
  );
} 