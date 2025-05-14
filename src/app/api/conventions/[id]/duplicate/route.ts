import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";

export async function POST(
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

    // Create a new convention with the same data but new ID and DRAFT status
    const { id, createdAt, updatedAt, ...conventionData } = convention;
    const newConvention = await db.convention.create({
      data: {
        ...conventionData,
        name: `${conventionData.name} (Copy)`,
        status: ConventionStatus.DRAFT,
        organizerUserId: session.user.id,
      },
    });

    return NextResponse.json(newConvention);
  } catch (error) {
    console.error("Error duplicating convention:", error);
    return NextResponse.json(
      { error: "Failed to duplicate convention" },
      { status: 500 }
    );
  }
} 