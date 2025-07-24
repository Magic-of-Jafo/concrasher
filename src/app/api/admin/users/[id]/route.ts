import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * DELETE /api/admin/users/[id]
 * @summary Deletes a user permanently
 * @tags User Management
 * @param id - User ID to delete
 * @return {object} 200 - User successfully deleted
 * @return {object} 401 - Unauthorized
 * @return {object} 403 - Forbidden (non-admin)
 * @return {object} 404 - User not found
 * @return {object} 500 - Internal server error
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Security: Validate session and admin role
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!session.user.roles?.includes(Role.ADMIN)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Prevent admin from deleting themselves
        if (session.user.id === params.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        const userId = params.id;

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                roles: true
            },
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent deletion of other admin users (optional safety measure)
        if (existingUser.roles.includes(Role.ADMIN)) {
            return NextResponse.json(
                { error: 'Cannot delete admin users' },
                { status: 400 }
            );
        }

        // Hard delete the user
        const deletedUser = await db.user.delete({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });

        return NextResponse.json({
            message: 'User successfully deleted',
            user: deletedUser,
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 