import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import AdminConventionList from "./AdminConventionList";
import { Box, Container, Typography } from "@mui/material";

export default async function AdminConventionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user is an admin
  const user = session.user as { roles: Role[] };
  if (!user.roles?.includes(Role.ADMIN)) {
    redirect("/"); // Redirect non-admin users
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Convention Management
        </Typography>
        <AdminConventionList />
      </Box>
    </Container>
  );
} 