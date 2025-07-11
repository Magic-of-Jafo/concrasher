import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";
import { z } from "zod";

const bulkActionSchema = z.object({
  action: z.enum(["delete", "status"]),
  conventionIds: z.array(z.string()),
  status: z.nativeEnum(ConventionStatus).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = bulkActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { action, conventionIds, status } = validation.data;

    // Verify all conventions belong to the user
    const conventions = await db.convention.findMany({
      where: {
        id: { in: conventionIds },
        series: {
          organizerUserId: session.user.id,
        },
      },
    });

    if (conventions.length !== conventionIds.length) {
      return NextResponse.json(
        { error: "Some conventions were not found or you don't have permission" },
        { status: 403 }
      );
    }

    // Perform the bulk action
    if (action === "delete") {
      await db.convention.deleteMany({
        where: {
          id: { in: conventionIds },
        },
      });
    } else if (action === "status" && status) {
      await db.convention.updateMany({
        where: {
          id: { in: conventionIds },
        },
        data: {
          status,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
} 