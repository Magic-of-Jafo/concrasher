import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { PriceDiscountSchema } from '@/lib/validators';
import type { Prisma } from '@prisma/client';

// Schema for the request body, expecting an array of price discounts
const PriceDiscountsPayloadSchema = z.object({
  priceDiscounts: z.array(
    PriceDiscountSchema.omit({ id: true, conventionId: true }).extend({ 
      id: z.string().optional(), // id is optional on input
      // priceTierId should be present and valid from client
    })
  ),
});

// Helper function to normalize discount data
const normalizePriceDiscountData = (discount: any, conventionId: string) => ({
  ...discount,
  discountedAmount: Number(discount.discountedAmount), // Ensure amount is a number
  cutoffDate: new Date(discount.cutoffDate), // Ensure date is a Date object
  priceTierId: discount.priceTierId, // Assuming this is correctly provided
  conventionId: conventionId,
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: conventionId } = params;

  if (!conventionId) {
    return NextResponse.json({ message: 'Convention ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = PriceDiscountsPayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request payload for discounts', errors: validation.error.errors }, { status: 400 });
    }

    const { priceDiscounts: incomingDiscounts } = validation.data;

    const savedDiscounts = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Delete all existing price discounts for this convention
      await tx.priceDiscount.deleteMany({
        where: { conventionId },
      });

      // 2. Create new price discounts
      if (incomingDiscounts.length === 0) {
        return []; // Return empty if no discounts sent, after deleting existing ones
      }
      
      const createdDiscounts = [];
      for (const discountData of incomingDiscounts) {
        // Additional validation: Ensure the referenced priceTierId exists for this convention
        const tierExists = await tx.priceTier.findFirst({
          where: {
            id: discountData.priceTierId,
            conventionId: conventionId,
          },
        });

        if (!tierExists) {
          // Log or handle this error - perhaps skip this discount or throw an error to fail the transaction
          console.warn(`Skipping discount for non-existent or non-associated PriceTier ID: ${discountData.priceTierId}`);
          continue; // Skip this discount
        }

        const normalizedData = normalizePriceDiscountData(discountData, conventionId);
        const newDiscount = await tx.priceDiscount.create({
          data: {
            cutoffDate: normalizedData.cutoffDate,
            discountedAmount: normalizedData.discountedAmount,
            priceTierId: normalizedData.priceTierId,
            conventionId: conventionId,
          },
        });
        createdDiscounts.push(newDiscount);
      }
      return createdDiscounts;
    });

    return NextResponse.json(savedDiscounts, { status: 200 });

  } catch (error) {
    console.error('Error saving price discounts:', error);
    if (error instanceof z.ZodError) { // Should be caught by safeParse earlier
      return NextResponse.json({ message: 'Validation failed for discounts', errors: error.errors }, { status: 400 });
    }
    // Handle potential errors from transaction, e.g., foreign key constraint if a tier ID is invalid
    // (though we added a check for tierExists)
    return NextResponse.json({ message: 'An internal server error occurred while saving discounts' }, { status: 500 });
  }
} 