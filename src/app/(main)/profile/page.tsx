"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import RoleApplicationList from '@/components/admin/RoleApplicationList';
import ProfileTabs from "@/components/features/ProfileTabs";
import { RoleApplication, Brand, User, Role } from "@prisma/client";
import eventBus from "@/lib/event-bus";

interface RoleApplicationWithUser extends RoleApplication {
  user: {
    name: string | null;
    email: string | null;
  }
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();

  const [user, setUser] = useState<User | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(undefined);
  const [roleApplications, setRoleApplications] = useState<RoleApplication[]>([]);
  const [ownedBrands, setOwnedBrands] = useState<Brand[]>([]);
  const [pendingApplications, setPendingApplications] = useState<RoleApplicationWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect("/login");
    }

    if (status === 'authenticated' && session?.user?.id) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/profile/${session.user.id}`);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch profile data. Server responded with ${response.status}: ${errorText}`);
          }
          const data = await response.json();
          setUser(data.user);
          setImageUrl(data.user.image); // Initialize image URL state
          setRoleApplications(data.roleApplications);
          setOwnedBrands(data.ownedBrands);
          if (data.user.roles.includes(Role.ADMIN)) {
            setPendingApplications(data.pendingApplications);
          }
        } catch (error: any) {
          console.error(error);
          setError(error.message || "An unknown error occurred.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [status, session?.user?.id]); // Depend only on user ID

  useEffect(() => {
    const handleApplicationProcessed = (applicationId: string) => {
      setPendingApplications((prev) =>
        prev.filter((app) => app.id !== applicationId)
      );
    };

    eventBus.on('applicationProcessed', handleApplicationProcessed);

    return () => {
      eventBus.off('applicationProcessed', handleApplicationProcessed);
    };
  }, []);

  const handleApplicationProcessed = useCallback((applicationId: string) => {
    setPendingApplications((prev) =>
      prev.filter((app) => app.id !== applicationId)
    );
  }, []);

  const handleImageUpdate = useCallback(async (newUrl: string | null) => {
    // Optimistic UI update for the profile page itself
    setImageUrl(newUrl);

    // Broadcast the change to other components like the header
    eventBus.emit('profileImageChanged', newUrl);

    // Sync session in the background for future page loads
    await updateSession({ image: newUrl });
  }, [updateSession]);

  if (status === 'loading' || isLoading) {
    return <Container maxWidth="lg" sx={{ py: 4 }}><Typography>Loading...</Typography></Container>;
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Could not load profile.</Typography>
        {error && <Typography color="error" sx={{ mt: 2 }}><strong>Reason:</strong> {error}</Typography>}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Profile
      </Typography>

      <Paper sx={{ p: { xs: 1, md: 2 }, boxShadow: 'none', border: 'none' }}>
        <ProfileTabs
          user={user}
          roleApplications={roleApplications}
          ownedBrands={ownedBrands}
          currentImageUrl={imageUrl}
          onImageUpdate={handleImageUpdate}
          pendingApplications={pendingApplications}
          onApplicationProcessed={handleApplicationProcessed}
        />
      </Paper>

    </Container>
  );
} 