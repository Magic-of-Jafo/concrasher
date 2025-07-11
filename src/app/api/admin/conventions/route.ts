import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is an admin
  const user = session.user as { roles: Role[] };
  if (!user.roles?.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");

  try {
    const [conventions, total] = await Promise.all([
      db.convention.findMany({
        include: {
          series: {
            include: {
              organizer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: page * pageSize,
        take: pageSize,
      }),
      db.convention.count(),
    ]);

    return NextResponse.json({
      data: conventions,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching conventions:", error);
    return NextResponse.json(
      { error: "Failed to fetch conventions" },
      { status: 500 }
    );
  }
} 