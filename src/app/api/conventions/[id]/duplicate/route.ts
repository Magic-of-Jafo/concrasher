import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConventionStatus, Role } from "@prisma/client";
import { generateShortRandomId } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: currentUserId, roles } = session.user as { id: string; roles: Role[] };
  const isAdmin = roles.includes(Role.ADMIN);

  try {
    const originalConvention = await db.convention.findUnique({
      where: { id: params.id },
      include: { series: true },
    });

    if (!originalConvention) {
      return NextResponse.json({ error: "Convention not found" }, { status: 404 });
    }

    if (!isAdmin && originalConvention.series?.organizerUserId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      id,
      createdAt,
      updatedAt,
      deletedAt,
      slug: originalSlug,
      name: originalName,
      status: originalStatus,
      series,
      ...restOfConventionData
    } = originalConvention;

    let newSlug = `${originalSlug}-copy`;
    let existingBySlug = await db.convention.count({ where: { slug: newSlug, deletedAt: null } });
    if (existingBySlug > 0) {
      newSlug = `${originalSlug}-copy-${generateShortRandomId()}`;
      existingBySlug = await db.convention.count({ where: { slug: newSlug, deletedAt: null } });
      if (existingBySlug > 0) {
        newSlug = `${originalSlug}-copy-${Date.now()}-${generateShortRandomId(4)}`;
      }
    }

    const newName = `${originalName} (Copy)`;

    const newConvention = await db.convention.create({
      data: {
        ...restOfConventionData,
        name: newName,
        slug: newSlug,
        status: ConventionStatus.DRAFT,
        seriesId: originalConvention.seriesId,
      },
    });

    return NextResponse.json(newConvention);
  } catch (error) {
    console.error("Error duplicating convention:", error);
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return NextResponse.json(
        { error: "Failed to generate a unique slug for the duplicated convention. Please try again or rename the original if it's very long." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to duplicate convention" },
      { status: 500 }
    );
  }
} 