import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Role, RequestedRole, ApplicationStatus } from "@prisma/client";
import BrandCreateForm from "@/components/features/BrandCreateForm";
import { Container, Paper, Typography } from "@mui/material";

export default async function NewBrandPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Authorization check: User must be an ADMIN or have an approved BRAND_CREATOR application
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true },
    });

    if (!user?.roles.includes(Role.ADMIN)) {
        const approvedBrandCreatorApplication = await db.roleApplication.findFirst({
            where: {
                userId: session.user.id,
                requestedRole: RequestedRole.BRAND_CREATOR,
                status: ApplicationStatus.APPROVED,
            }
        });
        if (!approvedBrandCreatorApplication) {
            // Redirect to profile or an unauthorized page if they don't have access
            redirect("/profile?error=unauthorized");
        }
    }

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Create a New Brand
                </Typography>
                <Typography paragraph>
                    Fill out the details below to establish your new brand on the platform.
                </Typography>
                <BrandCreateForm />
            </Paper>
        </Container>
    );
} 