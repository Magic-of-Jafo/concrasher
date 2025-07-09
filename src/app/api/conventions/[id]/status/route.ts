import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.nativeEnum(ConventionStatus),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  console.log('Status update request for convention:', params.id);
  console.log('Session user:', session?.user?.id, 'roles:', session?.user?.roles);

  if (!session || !session.user) {
    console.log('No session or user found');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if the user has permission to update this convention
    const userRoles = session.user.roles || [];
    const isAdmin = userRoles.includes('ADMIN');

    console.log('User roles:', userRoles, 'isAdmin:', isAdmin);

    // First check if the convention exists
    const convention = await db.convention.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        series: {
          select: {
            organizerUserId: true,
          },
        },
      },
    });

    console.log('Convention found:', convention);

    if (!convention) {
      console.log('Convention not found');
      return NextResponse.json(
        { error: "Convention not found" },
        { status: 404 }
      );
    }

    // Check if user is the organizer or an admin
    const isOrganizer = convention.series?.organizerUserId === session.user.id;

    console.log('Permission check - isAdmin:', isAdmin, 'isOrganizer:', isOrganizer);

    if (!isAdmin && !isOrganizer) {
      console.log('Permission denied');
      return NextResponse.json(
        { error: "You don't have permission to update this convention" },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    console.log('Request body:', body);

    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) {
      console.log('Validation failed:', validation.error);
      return NextResponse.json(
        { error: "Invalid status", details: validation.error.format() },
        { status: 400 }
      );
    }

    console.log('Updating status from', convention.status, 'to', validation.data.status);

    // Update the convention status
    const updatedConvention = await db.convention.update({
      where: {
        id: params.id,
      },
      data: {
        status: validation.data.status,
      },
    });

    console.log('Status updated successfully:', updatedConvention.status);
    return NextResponse.json(updatedConvention);
  } catch (error) {
    console.error("Error updating convention status:", error);
    return NextResponse.json(
      { error: "Failed to update convention status" },
      { status: 500 }
    );
  }
} 