import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: conventionId } = params;
  const { searchParams } = new URL(request.url);
  const cutoffDateString = searchParams.get('cutoffDate');

  console.log(`[API DELETE /discounts-by-date] Received request. Convention ID: ${conventionId}, Cutoff Date String: ${cutoffDateString}`);

  if (!conventionId) {
    return NextResponse.json({ message: 'Convention ID is required' }, { status: 400 });
  }
  if (!cutoffDateString) {
    return NextResponse.json({ message: 'Cutoff date is required as a query parameter.' }, { status: 400 });
  }

  // Validate IDs and date format
  try {
    z.string().cuid().parse(conventionId);
    // Validate date string format (YYYY-MM-DD)
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }).parse(cutoffDateString);
  } catch (err: any) {
    const message = err instanceof z.ZodError ? err.errors.map((e:any) => e.message).join(', ') : 'Invalid ID or date format.';
    return NextResponse.json({ message }, { status: 400 });
  }

  // Parse YYYY-MM-DD string as UTC components
  const [year, month, day] = cutoffDateString.split('-').map(Number);

  // Construct startDate and endDate as UTC midnight
  // Note: JavaScript month is 0-indexed (0 for January, 11 for December)
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0)); // Start of the next day in UTC

  console.log(`[API DELETE /discounts-by-date] Constructed UTC date range for deletion: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

  try {
    const deleteResult = await prisma.priceDiscount.deleteMany({
      where: {
        conventionId: conventionId,
        cutoffDate: {
          gte: startDate, // Greater than or equal to the start of the target day
          lt: endDate,    // Less than the start of the next day
        },
      },
    });

    console.log(`[API DELETE /discounts-by-date] Prisma deleteMany result count: ${deleteResult.count}`);

    if (deleteResult.count === 0) {
      // This isn't necessarily an error; it could be that no discounts existed for that date.
      return NextResponse.json({ message: 'No price discounts found for the specified date to delete, or they were already deleted.', count: 0 }, { status: 200 });
    }

    return NextResponse.json({ message: `Successfully deleted ${deleteResult.count} price discount(s) for date ${cutoffDateString}.`, count: deleteResult.count }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting price discounts for convention ${conventionId} and date ${cutoffDateString}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ message: `Database error: ${error.message}`, code: error.code }, { status: 500 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
} 