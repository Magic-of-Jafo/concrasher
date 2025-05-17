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

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if the convention exists and belongs to the user
    const convention = await db.convention.findUnique({
      where: {
        id: params.id,
        organizerUserId: session.user.id,
      },
    });

    if (!convention) {
      return NextResponse.json(
        { error: "Convention not found" },
        { status: 404 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid status", details: validation.error.format() },
        { status: 400 }
      );
    }

    // Update the convention status
    const updatedConvention = await db.convention.update({
      where: {
        id: params.id,
      },
      data: {
        status: validation.data.status,
      },
    });

    return NextResponse.json(updatedConvention);
  } catch (error) {
    console.error("Error updating convention status:", error);
    return NextResponse.json(
      { error: "Failed to update convention status" },
      { status: 500 }
    );
  }
} 