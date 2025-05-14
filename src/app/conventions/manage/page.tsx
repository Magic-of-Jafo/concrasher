import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ConventionList from "./ConventionList";
import { Box, Container, Typography } from "@mui/material";

export default async function ConventionManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Conventions
        </Typography>
        <ConventionList />
      </Box>
    </Container>
  );
} 