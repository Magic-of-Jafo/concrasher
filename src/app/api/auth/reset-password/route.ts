import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    console.log('Starting password reset request...');
    const { email } = await request.json();
    console.log('Email received:', email);

    // Find user by email
    console.log('Looking up user...');
    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log('User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      // Return success even if user doesn't exist for security
      return NextResponse.json({ message: 'If an account exists, you will receive a password reset email.' });
    }

    // Generate reset token
    console.log('Generating reset token...');
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save reset token to user
    console.log('Updating user with reset token...');
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });
      console.log('User updated successfully');
    } catch (updateError) {
      console.error('Error updating user:', updateError);
      throw updateError;
    }

    // For testing: Log the reset URL instead of sending email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;
    console.log('TESTING: Password reset URL:', resetUrl);
    console.log('TESTING: Reset token:', resetToken);

    return NextResponse.json({
      message: 'If an account exists, you will receive a password reset email.',
      // Include the token in the response for testing
      resetToken
    });
  } catch (error) {
    console.error('Password reset error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
    return NextResponse.json(
      { message: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
} 