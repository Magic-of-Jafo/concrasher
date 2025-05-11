import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming aliased path
import { db } from '@/lib/db'; // Assuming aliased path
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/features/ProfileForm'; // Assuming aliased path
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { Role, ApplicationStatus, RequestedRole } from '@prisma/client'; // Added
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

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login'); // Or your configured login path
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      bio: true,
      roles: true, // Added to fetch roles
      roleApplications: { // Added to fetch relevant application
        where: {
          requestedRole: RequestedRole.ORGANIZER,
        },
        orderBy: {
          createdAt: 'desc', // Get the latest application if multiple exist (though unique constraint should prevent relevant multiple)
        },
        take: 1,
      },
    },
  });

  if (!user) {
    // This case should ideally not happen if a session exists
    // but good practice to handle it.
    // redirect('/login'); or show an error
    return (
      <Container maxWidth="sm">
        <Paper sx={{ mt: 4, p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom color="error">
            Error
          </Typography>
          <Typography>
            Could not load user profile. Please try logging out and back in.
          </Typography>
        </Paper>
      </Container>
    );
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
    <Container maxWidth="md">
      <Paper sx={{ my: { xs: 2, md: 4 }, p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {profileTitle}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Account Information</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" gutterBottom>
            <strong>Email:</strong> {user.email || 'Not set'}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Display Name:</strong> {user.name || 'Not set'}
          </Typography>
          <Typography variant="subtitle1">
            <strong>Bio:</strong> {user.bio || 'Not set'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Edit Profile
          </Typography>
          <Divider sx={{ my: 1 }} />
          <ProfileForm currentName={user.name} currentBio={user.bio} />
        </Box>

        {!isAdmin && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Role Management
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            {!isOrganizer && (
              <Box mb={3}> {/* Add margin bottom if Talent section follows */}
                <Typography variant="subtitle1" gutterBottom>
                  Organizer Role
                </Typography>
                <OrganizerApplicationButton 
                  currentRoles={user.roles} 
                  existingApplicationStatus={user.roleApplications[0]?.status} 
                />
              </Box>
            )}

            {/* Talent section is always available for non-admins */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Talent Role
              </Typography>
              <TalentActivationButton initialRoles={user.roles} />
            </Box>
          </Box>
        )}

      </Paper>
    </Container>
  );
} 