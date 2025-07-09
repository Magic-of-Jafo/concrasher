import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
    req: NextRequest,
    { params }: { params: { venueId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { venueId } = params;

    if (!venueId) {
        return NextResponse.json({ error: "Venue ID is required" }, { status: 400 });
    }

    try {
        const venue = await prisma.venue.findUnique({
            where: { id: venueId },
            include: {
                convention: {
                    include: {
                        series: {
                            select: {
                                organizerUserId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!venue) {
            return NextResponse.json({ error: "Venue not found" }, { status: 404 });
        }

        // Ensure the convention and series are loaded before checking ownership
        if (!venue.convention || !venue.convention.series) {
            return NextResponse.json({ error: "Could not verify venue ownership." }, { status: 500 });
        }

        if (venue.convention.series.organizerUserId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.venue.delete({
            where: { id: venueId },
        });

        return NextResponse.json({ message: "Venue deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting venue:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
