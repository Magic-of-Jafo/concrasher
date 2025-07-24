import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * GET /api/admin/users
 * @summary Fetches paginated list of users with search and sorting
 * @tags User Management
 * @param page - Page number (defaults to 1)
 * @param limit - Items per page (defaults to 50)
 * @param search - Search term for email/name filtering
 * @return {object} 200 - Paginated user list with metadata
 * @return {object} 401 - Unauthorized
 * @return {object} 403 - Forbidden (non-admin)
 * @return {object} 500 - Internal server error
 */
export async function GET(request: Request) {
    try {
        // Security: Validate session and admin role
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!session.user.roles?.includes(Role.ADMIN)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const searchQuery = searchParams.get('search') || '';

        // Ensure valid pagination parameters
        const validPage = Math.max(1, page);
        const validLimit = Math.min(Math.max(1, limit), 100); // Cap at 100 items per page

        // Build where clause for search
        const whereClause = searchQuery
            ? {
                OR: [
                    { email: { contains: searchQuery, mode: 'insensitive' as const } },
                    { firstName: { contains: searchQuery, mode: 'insensitive' as const } },
                    { lastName: { contains: searchQuery, mode: 'insensitive' as const } },
                ],
            }
            : {};

        // Fetch users with pagination
        const [users, totalUserCount] = await Promise.all([
            db.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    image: true,
                    roles: true,
                    emailVerified: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (validPage - 1) * validLimit,
                take: validLimit,
            }),
            db.user.count({
                where: whereClause,
            }),
        ]);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalUserCount / validLimit);
        const hasNextPage = validPage < totalPages;
        const hasPrevPage = validPage > 1;

        return NextResponse.json({
            users,
            pagination: {
                currentPage: validPage,
                totalPages,
                totalUsers: totalUserCount,
                limit: validLimit,
                hasNextPage,
                hasPrevPage,
            },
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 