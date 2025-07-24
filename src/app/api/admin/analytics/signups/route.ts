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
        
        // Ensure end date is end of day, start date is start of day
        endDate.setHours(23, 59, 59, 999);
        startDate.setHours(0, 0, 0, 0);

        // Query database for signup counts grouped by date
        const signupData = await db.$queryRaw<Array<{date: string, count: number}>>`
            SELECT 
                DATE("createdAt") as date,
                COUNT(*) as count
            FROM "User"
            WHERE "createdAt" >= ${startDate} 
                AND "createdAt" <= ${endDate}
            GROUP BY DATE("createdAt")
            ORDER BY DATE("createdAt") ASC
        `;

        // Convert BigInt count to number for JSON serialization
        const formattedData = signupData.map(item => ({
            date: item.date,
            count: Number(item.count)
        }));

        return NextResponse.json(formattedData);
        
    } catch (error) {
        console.error('Error fetching signup analytics:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
} 