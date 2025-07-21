import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import EmailVerificationEmail from '../../../../emails/EmailVerificationEmail';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the current user
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if email is already verified
        if (user.emailVerified) {
            return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
        }

        // Delete any existing verification tokens for this user
        await db.verificationToken.deleteMany({
            where: { identifier: user.email },
        });

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store new verification token
        await db.verificationToken.create({
            data: {
                identifier: user.email,
                token: verificationToken,
                expires: verificationTokenExpiry,
            },
        });

        // Send verification email
        try {
            // Use NEXT_PUBLIC_APP_URL as primary, fallback to NEXTAUTH_URL, then hardcoded domain
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://conventioncrasher.com';
            const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

            await sendEmail({
                to: user.email,
                subject: 'Verify your email address - Convention Crasher',
                react: EmailVerificationEmail({
                    userName: user.email.split('@')[0], // Use email prefix as name fallback
                    verificationUrl,
                }),
            });

            return NextResponse.json({
                message: 'Verification email sent successfully'
            });

        } catch (emailError) {
            console.error('[API Resend Verification] CRITICAL: Failed to send verification email:', emailError);
            return NextResponse.json({
                error: 'Failed to send verification email. Please try again later.'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[API Resend Verification] Error:', error);
        return NextResponse.json({
            error: 'An unexpected error occurred'
        }, { status: 500 });
    }
} 