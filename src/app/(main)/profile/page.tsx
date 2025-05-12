'use client';

import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import AdminGuard from '@/components/auth/AdminGuard';
import ProfileForm from '@/components/features/ProfileForm'; // Assuming aliased path
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import OrganizerApplicationButton from '@/components/features/OrganizerApplicationButton'; // Added
import TalentActivationButton from '@/components/features/TalentActivationButton'; // Added

// Helper component to manage client-side state for displaying updated profile data
// This is needed because the page is a Server Component, but we want to reflect
// updates from ProfileForm (Client Component) immediately without a full page reload
// if revalidatePath alone isn't sufficient or for a smoother UX.
// For this iteration, we'll rely on revalidatePath and a page refresh if needed,
// but an alternative is to lift state or use a client component wrapper.

// For now, we will make a simpler page component and let ProfileForm handle its state
// and revalidatePath handle data refresh.

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  roles: Role[];
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return <div>Loading...</div>;
  }

  const isAdmin = user.roles.includes(Role.ADMIN);
  const isOrganizer = user.roles.includes(Role.ORGANIZER);
  let profileTitle = "Your Profile";

  if (isAdmin) {
    profileTitle = "Your Admin Profile";
  } else if (isOrganizer) {
    profileTitle = "Your Organizer Profile";
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{profileTitle}</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-2">
          <p><span className="font-medium">Name:</span> {user.name || 'Not set'}</p>
          <p><span className="font-medium">Email:</span> {user.email}</p>
          <p>
            <span className="font-medium">Roles:</span>{' '}
            {user.roles.map((role: Role) => (
              <span
                key={role}
                className={`inline-block px-2 py-1 rounded text-sm mr-2 ${
                  role === Role.ADMIN
                    ? 'bg-purple-100 text-purple-800'
                    : role === Role.ORGANIZER
                    ? 'bg-blue-100 text-blue-800'
                    : role === Role.TALENT
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {role}
              </span>
            ))}
          </p>
        </div>
      </div>

      {isAdmin && (
        <AdminGuard>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="/admin/dashboard"
                className="block p-4 border rounded-lg hover:bg-gray-50"
              >
                <h3 className="font-medium mb-2">Admin Dashboard</h3>
                <p className="text-sm text-gray-600">Manage conventions, users, and applications</p>
              </a>
              <a
                href="/admin/applications"
                className="block p-4 border rounded-lg hover:bg-gray-50"
              >
                <h3 className="font-medium mb-2">Role Applications</h3>
                <p className="text-sm text-gray-600">Review and manage role applications</p>
              </a>
              <a
                href="/admin/users"
                className="block p-4 border rounded-lg hover:bg-gray-50"
              >
                <h3 className="font-medium mb-2">User Management</h3>
                <p className="text-sm text-gray-600">Manage user accounts and roles</p>
              </a>
            </div>
          </div>
        </AdminGuard>
      )}

      {!isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Role Management</h2>
          <div className="space-y-4">
            {!isOrganizer && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Become an Organizer</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Apply to become an organizer and manage your own conventions.
                </p>
                <a
                  href="/organizer/apply"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Apply Now
                </a>
              </div>
            )}
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Talent Profile</h3>
              <p className="text-sm text-gray-600 mb-4">
                Activate your talent profile to be discovered by convention organizers.
              </p>
              <TalentActivationButton initialRoles={user.roles} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 