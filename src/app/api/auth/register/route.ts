import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RegistrationSchema } from '../../../../lib/validators'; // Adjusted path
import { sendEmail } from '../../../../lib/email';
import EmailVerificationEmail from '../../../../../emails/EmailVerificationEmail';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = RegistrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }


    const { email, password } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists but is not verified, we could resend the verification email.
      // For now, we'll just return an error to keep it simple.
      return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        roles: [Role.USER], // Assuming Role.USER is correctly defined in your Prisma schema
      },
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: verificationTokenExpiry,
      },
    });


    // Send verification email
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`;

      await sendEmail({
        to: email,
        subject: 'Verify your email address - Convention Crasher',
        react: EmailVerificationEmail({
          userEmail: email,
          verificationUrl,
          userName: email.split('@')[0], // Use email prefix as name fallback
        }),
      });

    } catch (emailError) {
      console.error('[API Register] CRITICAL: Failed to send verification email:', emailError);
      // Don't fail the registration if email sending fails
    }

    // Omit password from the returned user object
    const { hashedPassword: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'User registered successfully. Please check your email to verify your account.'
    }, { status: 201 });

  } catch (error) {
    console.error('[API Register] FINAL_ERROR: An unexpected error occurred in the registration API:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
} 