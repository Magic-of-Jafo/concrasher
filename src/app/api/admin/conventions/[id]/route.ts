import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is an admin
  const user = session.user as { roles: Role[] };
  if (!user.roles?.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Check if the convention exists
    const convention = await db.convention.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!convention) {
      return NextResponse.json(
        { error: "Convention not found" },
        { status: 404 }
      );
    }

    // Delete the convention
    await db.convention.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting convention:", error);
    return NextResponse.json(
      { error: "Failed to delete convention" },
      { status: 500 }
    );
  }
} 