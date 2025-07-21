import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

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

    // Create reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://conventioncrasher.com';
    const resetUrl = `${appUrl}/reset-password/${resetToken}`;

    // Send password reset email
    console.log('Sending password reset email...');
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.stageName || user.firstName || undefined
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Don't fail the request, but log the error
      return NextResponse.json({
        message: 'If an account exists, you will receive a password reset email.',
        warning: 'Email delivery may be delayed'
      });
    }

    console.log('Password reset email sent successfully');
    return NextResponse.json({ message: 'If an account exists, you will receive a password reset email.' });
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