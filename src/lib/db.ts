import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;

/**
 * Loads comprehensive convention data with all relationships for the detail page
 * @param id - Convention ID
 * @returns Convention with all related entities or null if not found
 */
export async function getConventionDetailsByIdWithRelations(id: string) {
  try {
    const convention = await db.convention.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        // Basic relationships
        series: true,

        // Pricing information
        priceTiers: {
          orderBy: {
            order: 'asc'
          }
        },
        priceDiscounts: {
          include: {
            priceTier: true
          },
          orderBy: {
            cutoffDate: 'asc'
          }
        },

        // Venue information
        venues: {
          include: {
            photos: true
          },
          orderBy: [
            { isPrimaryVenue: 'desc' },
            { createdAt: 'asc' }
          ]
        },

        // Hotel information
        hotels: {
          include: {
            photos: true
          },
          orderBy: [
            { isPrimaryHotel: 'desc' },
            { createdAt: 'asc' }
          ]
        },

        // Schedule information
        scheduleDays: {
          include: {
            events: {
              include: {
                venue: true,
                talentLinks: true,
                brandLinks: true,
                feeTiers: true
              },
              orderBy: [
                { startTimeMinutes: 'asc' },
                { order: 'asc' }
              ]
            }
          },
          orderBy: {
            dayOffset: 'asc'
          }
        },
        scheduleItems: {
          include: {
            venue: true,
            talentLinks: true,
            brandLinks: true,
            feeTiers: true,
            scheduleDay: true
          },
          orderBy: [
            { dayOffset: 'asc' },
            { startTimeMinutes: 'asc' },
            { order: 'asc' }
          ]
        },

        // Dealer information
        dealerLinks: {
          orderBy: {
            order: 'asc'
          }
        },

        // Media gallery
        media: {
          orderBy: {
            order: 'asc'
          }
        }

        // Note: settings relationship temporarily commented out due to type issue
        // TODO: Re-add settings: true after regenerating Prisma types
      }
    });

    return convention;
  } catch (error) {
    console.error('Error loading convention details:', error);
    throw error;
  }
} 