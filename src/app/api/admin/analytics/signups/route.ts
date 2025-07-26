import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * GET /api/admin/analytics/signups
 * @summary Fetches user signup analytics data grouped by day
 * @tags Analytics
 * @param startDate - Optional start date (defaults to 30 days ago)
 * @param endDate - Optional end date (defaults to today)
 * @return {object} 200 - Array of signup data by date
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
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Default to last 30 days
        const endDate = endDateParam ? new Date(endDateParam) : new Date();
        const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Adjust end date to include the entire day
        endDate.setHours(23, 59, 59, 999);
        startDate.setHours(0, 0, 0, 0);

        // Query database for signup counts grouped by createdAt date using Prisma
        const users = await db.user.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Group users by date and count
        const signupData = users.reduce((acc, user) => {
            // Use the same date formatting as UserManagement
            const formattedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            acc[formattedDate] = (acc[formattedDate] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Convert to array format
        const formattedData = Object.entries(signupData).map(([date, count]) => {
            return {
                date: date,
                count: count
            };
        });

        return NextResponse.json(formattedData);

    } catch (error) {
        console.error('Error fetching signup analytics:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 