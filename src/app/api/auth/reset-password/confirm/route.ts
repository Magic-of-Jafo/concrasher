import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendPasswordChangedEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user's password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Send password changed notification email
    console.log('Sending password changed notification email...');
    const emailResult = await sendPasswordChangedEmail(
      user.email,
      user.stageName || user.firstName || undefined
    );

    if (!emailResult.success) {
      console.error('Failed to send password changed email:', emailResult.error);
      // Don't fail the password reset, but log the error
      console.warn('Password reset successful but notification email failed to send');
    } else {
      console.log('Password changed notification email sent successfully');
    }

    return NextResponse.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { message: 'An error occurred while resetting your password.' },
      { status: 500 }
    );
  }
} 