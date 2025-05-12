import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role, RequestedRole, ApplicationStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, bio, experience } = body;

    // Validate required fields
    if (!name || !bio || !experience) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has an application
    const existingApplication = await db.roleApplication.findFirst({
      where: {
        userId: session.user.id,
        requestedRole: RequestedRole.ORGANIZER,
        status: {
          in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED]
        }
      }
    });

    if (existingApplication) {
      return NextResponse.json(
        { message: 'You already have a pending or approved application' },
        { status: 400 }
      );
    }

    // Create the application
    const application = await db.roleApplication.create({
      data: {
        userId: session.user.id,
        requestedRole: RequestedRole.ORGANIZER,
        status: ApplicationStatus.PENDING
      }
    });

    // Update user's name and bio
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        bio
      }
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error('Error creating organizer application:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 