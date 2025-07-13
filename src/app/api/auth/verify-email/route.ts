import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic'; // Ensures this route is always dynamic

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ message: 'Missing verification token' }, { status: 400 });
        }

        // Find the verification token
        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken) {
            return NextResponse.json({ message: 'Invalid verification token' }, { status: 400 });
        }

        // Check if token has expired
        if (verificationToken.expires < new Date()) {
            // Clean up expired token
            await prisma.verificationToken.delete({
                where: { token },
            });
            return NextResponse.json({ message: 'Verification token has expired' }, { status: 400 });
        }

        // Find the user by email (identifier)
        const user = await prisma.user.findUnique({
            where: { email: verificationToken.identifier },
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Update user as verified
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
        });

        // Send welcome email
        if (user.email) {
            await sendWelcomeEmail(user.firstName, user.email);
        }

        // Clean up the verification token
        await prisma.verificationToken.delete({
            where: { token },
        });

        return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });

    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
} 