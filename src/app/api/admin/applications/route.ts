import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApplications, approveApplication, rejectApplication } from '@/lib/applications';
import type { ApplicationActionRequest } from '@/types/applications';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', JSON.stringify(session, null, 2)); // Debug log

    // Check if user is logged in and is an admin
    if (!session?.user || !session.user.roles?.includes(Role.ADMIN)) {
      console.log('Auth check failed:', {
        hasUser: !!session?.user,
        roles: session?.user?.roles
      });
      return NextResponse.json(
        { error: 'You must be an admin to view applications' },
        { status: 403 }
      );
    }

    // Get all role applications with user details
    const applications = await prisma.roleApplication.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('Raw applications from DB:', JSON.stringify(applications, null, 2)); // Debug log

    // Check if we're getting any data
    if (applications.length === 0) {
      console.log('No applications found in database');
    }

    return NextResponse.json(applications);

  } catch (error) {
    console.error('Error fetching role applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.roles?.includes('ADMIN')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { action, applicationId } = await request.json() as ApplicationActionRequest;

    if (!action || !applicationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    let result;
    switch (action) {
      case 'approve':
        result = await approveApplication(applicationId);
        break;
      case 'reject':
        result = await rejectApplication(applicationId);
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing application:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 