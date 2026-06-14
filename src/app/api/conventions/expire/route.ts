import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { expirePastConventions } from '@/lib/conventions/expire';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as { id: string; roles: Role[] } | undefined;

        if (!user || !user.roles?.includes(Role.ADMIN)) {
            return NextResponse.json({ message: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const count = await expirePastConventions();

        return NextResponse.json({
            message: `${count} conventions successfully updated to PAST status.`,
            count,
        });
    } catch (error) {
        console.error('Error updating expired conventions:', error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            errorMessage = `A database error occurred (code: ${error.code}). Please check the server logs.`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json(
            { error: `Failed to update expired conventions. Server Error: ${errorMessage}` },
            { status: 500 }
        );
    }
} 