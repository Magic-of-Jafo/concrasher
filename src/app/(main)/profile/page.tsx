import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, ApplicationStatus, RequestedRole } from "@prisma/client";
import { redirect } from "next/navigation";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AdminGuard from '@/components/auth/AdminGuard';
import ProfileForm from '@/components/features/ProfileForm';
import RoleRequestForm from '@/components/features/RoleRequestForm';
import TalentActivationButton from '@/components/features/TalentActivationButton';
import RoleApplicationList from '@/components/admin/RoleApplicationList';
import Link from 'next/link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      roles: true,
    }
  });

  if (!user) {
    // This should not happen if a session exists, but it's a good safeguard.
    redirect("/login");
  }

  const roleApplications = await db.roleApplication.findMany({
    where: { userId: user.id },
    select: {
      requestedRole: true,
      status: true,
    }
  });

  const isAdmin = user.roles.includes(Role.ADMIN);
  const isOrganizer = user.roles.includes(Role.ORGANIZER);
  const isBrandCreator = roleApplications.some(app => app.requestedRole === RequestedRole.BRAND_CREATOR && app.status === ApplicationStatus.APPROVED);
  let profileTitle = "Your Profile";

  if (isAdmin) {
    profileTitle = "Your Admin Profile";
  } else if (isOrganizer) {
    profileTitle = "Your Organizer Profile";
  }

  const pendingApplications = isAdmin ? await db.roleApplication.findMany({
    where: { status: ApplicationStatus.PENDING },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    },
  }) : [];

  const ownedBrands = await db.brand.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  // NOTE: The original component was a client component.
  // ProfileForm needs to be able to work with initial data from the server.
  // We are passing the full user object to it now.
  // TalentActivationButton and RoleRequestForm are designed as client components
  // and will receive the necessary props.

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {profileTitle}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Account Information</Typography>
          <Typography><strong>Name:</strong> {user.name || 'Not set'}</Typography>
          <Typography><strong>Email:</strong> {user.email}</Typography>
          <Typography component="div">
            <strong>Roles:</strong>{' '}
            {user.roles.map((role: Role) => (
              <Box component="span" key={role} sx={{
                display: 'inline-block',
                px: 1.5,
                py: 0.5,
                borderRadius: '12px',
                fontSize: '0.875rem',
                mr: 1,
                backgroundColor:
                  role === Role.ADMIN ? 'secondary.light' :
                    role === Role.ORGANIZER ? 'primary.light' :
                      role === Role.TALENT ? 'success.light' : 'grey.200',
                color:
                  role === Role.ADMIN ? 'secondary.contrastText' :
                    role === Role.ORGANIZER ? 'primary.contrastText' :
                      role === Role.TALENT ? 'success.contrastText' : 'text.primary',
              }}>
                {role}
              </Box>
            ))}
          </Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <ProfileForm currentName={user.name} currentBio={user.bio} />
      </Paper>

      {isAdmin && (
        <AdminGuard>
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" gutterBottom>Admin Actions</Typography>
            <RoleApplicationList applications={pendingApplications} />
          </Paper>
        </AdminGuard>
      )}

      {!isAdmin && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Role Management</Typography>
          <Box sx={{ my: 2 }}>
            <TalentActivationButton initialRoles={user.roles} />
          </Box>
          <Divider sx={{ my: 2 }} />
          <RoleRequestForm
            currentRoles={user.roles}
            existingApplications={roleApplications}
          />
        </Paper>
      )}

      {/* This link is for the next story task */}
      {(isAdmin || isBrandCreator) && (
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom>Brand Management</Typography>
          <Link href="/brands/new">Create a new Brand</Link>
          {ownedBrands.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Your Brands:</Typography>
              <List>
                {ownedBrands.map((brand) => (
                  <ListItem key={brand.id} disablePadding>
                    <Link href={`/brands/${brand.id}/edit`} passHref>
                      <ListItemText primary={`Edit "${brand.name}"`} />
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
} 