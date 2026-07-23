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

        // The venue's timezone: names the zone on the public schedule and
        // anchors its "today" auto-selection to the venue's calendar day.
        timezone: { select: { ianaId: true, value: true } },

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
                talentLinks: {
                  include: { talentProfile: { select: { id: true, displayName: true, userId: true } } },
                  orderBy: { order: 'asc' },
                },
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

        // Festival productions (shows) + their performances
        productions: {
          include: {
            performances: {
              include: { venue: true },
              orderBy: [{ dayOffset: 'asc' }, { startTimeMinutes: 'asc' }],
            },
          },
          orderBy: { order: 'asc' },
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
        },

        // Convention settings
        settings: {
          include: {
            currency: true
          }
        },

      }
    });

    if (!convention) return null;

    // Load talent separately so convention pages remain available while a
    // deployment's database is catching up with the talent-card schema. The
    // legacy query deliberately selects only columns that existed before the
    // talent-tab work; Prisma otherwise selects every scalar field and a
    // missing new column turns the entire convention page into a 404.
    let talent;
    try {
      talent = await db.conventionTalent.findMany({
        where: { conventionId: convention.id },
        include: {
          talentProfile: {
            include: {
              media: {
                where: { type: 'PROMO_IMAGE' },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
        orderBy: [
          { order: { sort: 'asc', nulls: 'last' } },
          { assignedAt: 'asc' },
        ],
      });
    } catch (talentError) {
      const code = (talentError as { code?: string })?.code;
      const message = talentError instanceof Error ? talentError.message : String(talentError);
      const isSchemaMismatch = code === 'P2022'
        || /PROMO_IMAGE|invalid input value for enum|column .* does not exist/i.test(message);

      if (!isSchemaMismatch) throw talentError;

      console.warn('Convention talent-card schema is not deployed yet; using legacy talent data.');
      const legacyTalent = await db.conventionTalent.findMany({
        where: { conventionId: convention.id },
        select: {
          id: true,
          conventionId: true,
          talentProfileId: true,
          overrideDisplayName: true,
          overrideBio: true,
          assignedAt: true,
          talentProfile: {
            include: { media: { orderBy: { order: 'asc' } } },
          },
        },
        orderBy: { assignedAt: 'asc' },
      });

      talent = legacyTalent.map((row) => ({
        ...row,
        order: null,
        isVisible: true,
        isHeadliner: false,
        imageUrl: null,
      }));
    }

    return { ...convention, talent };
  } catch (error) {
    console.error('Error loading convention details:', error);
    throw error;
  }
}
