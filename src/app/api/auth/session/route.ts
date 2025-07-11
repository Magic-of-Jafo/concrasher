import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current user's data from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stageName: true,
        email: true,
        roles: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const name =
      user.stageName || `${user.firstName || ''} ${user.lastName || ''}`.trim();

    // Update the session with the latest user data
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        id: user.id,
        name: name,
        email: user.email,
        roles: user.roles,
      },
    };

    return NextResponse.json(updatedSession);

  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { userId } = await request.json();

    if (!session?.user || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the updated user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stageName: true,
        email: true,
        roles: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const name =
      user.stageName || `${user.firstName || ''} ${user.lastName || ''}`.trim();

    // Get the current token
    const token = await getToken({ req: request as any });

    // Update the session with new roles
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        id: user.id,
        name: name,
        email: user.email,
        roles: user.roles,
      },
    };

    // Update the token
    if (token) {
      token.roles = user.roles;
    }

    return NextResponse.json({
      session: updatedSession,
      token
    });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
} 