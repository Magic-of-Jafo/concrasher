import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, ApplicationStatus } from "@prisma/client";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.id !== params.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = params.id;

        const userProfile = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                stageName: true,
                email: true,
                image: true,
                bio: true,
                roles: true,
            }
        });

        if (!userProfile) {
            return new NextResponse("User not found", { status: 404 });
        }

        const roleApplications = await db.roleApplication.findMany({
            where: { userId: userProfile.id },
            select: {
                requestedRole: true,
                status: true,
            }
        });

        const ownedBrands = await db.brand.findMany({
            where: { ownerId: userProfile.id },
            select: { id: true, name: true },
        });

        const isAdmin = userProfile.roles.includes(Role.ADMIN);
        const pendingApplicationsFromDb = isAdmin ? await db.roleApplication.findMany({
            where: { status: ApplicationStatus.PENDING },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        stageName: true,
                        email: true,
                    }
                }
            },
        }) : [];

        const user = {
            ...userProfile,
            name: userProfile.stageName || `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
        }

        const pendingApplications = pendingApplicationsFromDb.map(app => ({
            ...app,
            user: {
                ...app.user,
                name: app.user.stageName || `${app.user.firstName || ''} ${app.user.lastName || ''}`.trim(),
            }
        }))


        return NextResponse.json({
            user: user,
            roleApplications,
            ownedBrands,
            pendingApplications: pendingApplications,
        });

    } catch (error) {
        console.error("[PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 