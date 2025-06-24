import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Starting application processing for ID:', params.id);
    const session = await getServerSession(authOptions);

    // Check if user is logged in and is an admin
    if (!session?.user || !session.user.roles?.includes(Role.ADMIN)) {
      console.log('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'You must be an admin to perform this action' },
        { status: 403 }
      );
    }

    const { action } = await request.json();
    console.log('Action requested:', action);

    if (!action || !['approve', 'reject'].includes(action)) {
      console.log('Invalid action:', action);
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get the application
    const application = await prisma.roleApplication.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!application) {
      console.log('Application not found:', params.id);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    console.log('Found application:', application);

    // If approved, add the role to the user first
    if (action === 'approve') {
      console.log('Processing approval for user:', application.userId);
      // Get current user roles
      const user = await prisma.user.findUnique({
        where: { id: application.userId },
        select: { roles: true }
      });

      if (!user) {
        console.log('User not found:', application.userId);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.log('Current user roles:', user.roles);
      console.log('Requested role:', application.requestedRole);

      // Only add the role if it doesn't already exist
      if (!user.roles.includes(application.requestedRole)) {
        console.log('Adding new role to user');
        await prisma.user.update({
          where: { id: application.userId },
          data: {
            roles: {
              push: application.requestedRole
            }
          }
        });
      } else {
        console.log('User already has the requested role');
      }
    }

    // Update the application status
    console.log('Updating application status to:', action === 'approve' ? 'APPROVED' : 'REJECTED');
    const updatedApplication = await prisma.roleApplication.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED'
      }
    });

    console.log('Application updated:', updatedApplication);

    // Return success response
    console.log('Sending success response');
    return NextResponse.json({
      success: true,
      application: updatedApplication
    });

  } catch (error) {
    console.error('Error handling role application:', error);
    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    );
  }
} 