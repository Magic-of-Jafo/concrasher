import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export async function DELETE(
  request: Request, // request might not be used, but it's standard to include
  { params }: { params: { id: string; discountId: string } }
) {
  const { id: conventionId, discountId } = params;

  if (!conventionId) {
    return NextResponse.json({ message: 'Convention ID is required' }, { status: 400 });
  }
  if (!discountId) {
    return NextResponse.json({ message: 'Discount ID is required' }, { status: 400 });
  }

  // Validate CUIDs (optional, but good practice if not already handled by Next.js routing/Prisma)
  try {
    z.string().cuid().parse(conventionId);
    z.string().cuid().parse(discountId);
  } catch (err) {
    return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
  }

  try {
    // Ensure the discount exists and belongs to the specified convention
    // We can do this by trying to delete it with a compound where clause.
    // If the delete count is 0, it means no such discount existed or it didn't match the convention.
    const deleteResult = await prisma.priceDiscount.deleteMany({
      where: {
        id: discountId,
        conventionId: conventionId, 
      },
    });

    if (deleteResult.count === 0) {
      // Attempt to find out why: was the discountId itself not found, or just not for this convention?
      const discountExists = await prisma.priceDiscount.findUnique({ where: { id: discountId } });
      if (!discountExists) {
        return NextResponse.json({ message: 'Price discount not found.' }, { status: 404 });
      } else {
        // Discount exists but not for this convention
        return NextResponse.json({ message: 'Price discount not found for this convention or you do not have permission.' }, { status: 403 }); // Or 404, depending on desired privacy
      }
    }

    // If count > 0, deletion was successful
    return NextResponse.json({ message: 'Price discount deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting price discount ${discountId} for convention ${conventionId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Specific Prisma errors could be handled here if needed
      return NextResponse.json({ message: `Database error: ${error.message}`, code: error.code }, { status: 500 });
    }
    return NextResponse.json({ message: 'An internal server error occurred while deleting the price discount.' }, { status: 500 });
  }
} 