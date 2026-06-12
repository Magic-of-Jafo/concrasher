import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { checkAgentApiKey } from '@/lib/agent-auth';

export const dynamic = 'force-dynamic';

const ENRICHMENT_LOG_KEY = 'enrichment_log';
const ENRICHMENT_FIELDS_KEY = 'enrichment_fields';
const MAX_LOG_ENTRIES = 5;

const Confidence = z.enum(['low', 'medium', 'high', 'not_found']);

const EnrichmentSchema = z.object({
    tier1: z.object({
        officialName: z.string().nullable().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        stateOrRegion: z.string().max(100).nullable().optional(),
        country: z.string().max(100).nullable().optional(),
        venueName: z.string().max(200).nullable().optional(),
        registrationUrl: z.string().url().max(500).nullable().optional(),
        descriptionShort: z.string().max(1000).nullable().optional(),
        keywords: z.array(z.string().max(50)).optional(),
    }).optional(),
    tier2: z.object({
        currency: z.string().max(10).nullable().optional(),
        priceTiers: z.array(z.object({
            label: z.string().max(100),
            amount: z.number().nonnegative(),
        })).optional(),
        priceDiscounts: z.array(z.object({
            tierLabel: z.string().max(100),
            cutoffDate: z.coerce.date().nullable(),
            discountedAmount: z.number().nonnegative(),
        })).optional(),
    }).optional(),
    tier3: z.object({
        guestsStayAtPrimaryVenue: z.boolean().nullable().optional(),
        venue: z.object({
            name: z.string().max(200),
            description: z.string().max(2000).nullable().optional(),
            websiteUrl: z.string().url().max(500).nullable().optional(),
            googleMapsUrl: z.string().url().max(1000).nullable().optional(),
            streetAddress: z.string().max(300).nullable().optional(),
            city: z.string().max(100).nullable().optional(),
            stateRegion: z.string().max(100).nullable().optional(),
            postalCode: z.string().max(20).nullable().optional(),
            country: z.string().max(100).nullable().optional(),
            contactEmail: z.string().max(200).nullable().optional(),
            contactPhone: z.string().max(50).nullable().optional(),
            amenities: z.array(z.string().max(100)).optional(),
            parkingInfo: z.string().max(1000).nullable().optional(),
            publicTransportInfo: z.string().max(1000).nullable().optional(),
            accessibilityNotes: z.string().max(1000).nullable().optional(),
        }).nullable().optional(),
        hotels: z.array(z.object({
            name: z.string().max(200),
            isPrimary: z.boolean().optional(),
            isAtVenue: z.boolean().optional(),
            description: z.string().max(2000).nullable().optional(),
            websiteUrl: z.string().url().max(500).nullable().optional(),
            streetAddress: z.string().max(300).nullable().optional(),
            city: z.string().max(100).nullable().optional(),
            stateRegion: z.string().max(100).nullable().optional(),
            postalCode: z.string().max(20).nullable().optional(),
            country: z.string().max(100).nullable().optional(),
            contactEmail: z.string().max(200).nullable().optional(),
            contactPhone: z.string().max(50).nullable().optional(),
            groupRateOrBookingCode: z.string().max(200).nullable().optional(),
            groupPrice: z.string().max(500).nullable().optional(),
            bookingLink: z.string().url().max(1000).nullable().optional(),
            bookingCutoffDate: z.coerce.date().nullable().optional(),
            amenities: z.array(z.string().max(100)).optional(),
            parkingInfo: z.string().max(1000).nullable().optional(),
            publicTransportInfo: z.string().max(1000).nullable().optional(),
            accessibilityNotes: z.string().max(1000).nullable().optional(),
        })).optional(),
    }).optional(),
    meta: z.object({
        fieldConfidence: z.object({
            dates: Confidence,
            location: Confidence,
            venue: Confidence,
            pricing: Confidence,
            hotels: Confidence.optional(),
        }),
        sourcePages: z.array(z.string()),
        notes: z.string().nullable(),
        model: z.string().optional(),
    }),
});

type FieldChange = { field: string; from: unknown; to: unknown; reason: string };

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = checkAgentApiKey(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const validation = EnrichmentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.flatten() },
                { status: 400 }
            );
        }
        const { tier1, tier2, tier3, meta } = validation.data;

        const convention = await prisma.convention.findFirst({
            where: { OR: [{ id: params.id }, { slug: params.id }], deletedAt: null },
            include: { priceTiers: true, settings: true, venues: true, hotels: true },
        });
        if (!convention) {
            return NextResponse.json({ error: 'Convention not found' }, { status: 404 });
        }

        // Fields previously written by enrichment may be re-written; anything
        // else only fills blanks so human edits are never clobbered.
        const fieldsSetting = convention.settings.find(s => s.key === ENRICHMENT_FIELDS_KEY);
        const enrichedFields = new Set<string>(fieldsSetting ? JSON.parse(fieldsSetting.value) : []);

        const changes: FieldChange[] = [];
        const skipped: string[] = [];
        const update: Record<string, unknown> = {};

        const canWrite = (field: string, current: unknown) =>
            current === null || current === undefined || current === '' || enrichedFields.has(field);

        const propose = (field: string, current: unknown, incoming: unknown, reason: string) => {
            if (incoming === null || incoming === undefined) return;
            const same =
                current instanceof Date && incoming instanceof Date
                    ? current.getTime() === incoming.getTime()
                    : current === incoming;
            if (same) return;
            if (!canWrite(field, current)) {
                skipped.push(`${field} (has human-entered value)`);
                return;
            }
            update[field] = incoming;
            changes.push({ field, from: current, to: incoming, reason });
            enrichedFields.add(field);
        };

        if (tier1) {
            propose('city', convention.city, tier1.city, 'tier1');
            propose('country', convention.country, tier1.country, 'tier1');
            propose('venueName', convention.venueName, tier1.venueName, 'tier1');
            propose('registrationUrl', convention.registrationUrl, tier1.registrationUrl, 'tier1');
            propose('descriptionShort', convention.descriptionShort, tier1.descriptionShort, 'tier1');

            // State arrives as one string; map onto the two columns.
            if (tier1.stateOrRegion) {
                const isAbbr = /^[A-Z]{2}$/.test(tier1.stateOrRegion);
                propose(
                    isAbbr ? 'stateAbbreviation' : 'stateName',
                    isAbbr ? convention.stateAbbreviation : convention.stateName,
                    tier1.stateOrRegion,
                    'tier1'
                );
            }

            // Dates correct existing values only at high confidence; they fill
            // blanks (TBD listings) at high or medium.
            const dateConf = meta.fieldConfidence.dates;
            for (const [field, incoming] of [['startDate', tier1.startDate], ['endDate', tier1.endDate]] as const) {
                const current = convention[field];
                if (!incoming) continue;
                if (current === null ? ['high', 'medium'].includes(dateConf) : dateConf === 'high') {
                    propose(field, current, incoming, `tier1 dates (${dateConf} confidence)`);
                } else {
                    skipped.push(`${field} (confidence ${dateConf} too low)`);
                }
            }
            if ((update.startDate ?? convention.startDate) && convention.isTBD) {
                update.isTBD = false;
                changes.push({ field: 'isTBD', from: true, to: false, reason: 'dates now known' });
            }

            if (tier1.keywords?.length) {
                const merged = Array.from(new Set(convention.keywords.concat(tier1.keywords)));
                if (merged.length !== convention.keywords.length) {
                    update.keywords = merged;
                    changes.push({ field: 'keywords', from: convention.keywords, to: merged, reason: 'tier1 (append-only)' });
                }
            }
        }

        // Pricing is all-or-nothing: only create tiers when none exist, so an
        // organizer's pricing table is never mixed with agent output.
        let pricingCreated = 0;
        const tierCreates: { label: string; amount: number; order: number }[] = [];
        if (tier2?.priceTiers?.length) {
            if (convention.priceTiers.length > 0) {
                skipped.push('priceTiers (convention already has pricing)');
            } else if (meta.fieldConfidence.pricing === 'low' || meta.fieldConfidence.pricing === 'not_found') {
                skipped.push(`priceTiers (confidence ${meta.fieldConfidence.pricing})`);
            } else {
                tier2.priceTiers.forEach((t, i) => tierCreates.push({ label: t.label, amount: t.amount, order: i }));
            }
        }

        // Venue and hotels follow the same all-or-nothing rule as pricing:
        // never mix agent records into organizer-entered ones.
        let venueHotelCreated = 0;
        const venueConf = meta.fieldConfidence.venue;
        const hotelConf = meta.fieldConfidence.hotels ?? venueConf;
        let createVenue = false;
        let createHotels = false;
        if (tier3?.venue) {
            if (convention.venues.length > 0) skipped.push('venue (convention already has venues)');
            else if (venueConf === 'low' || venueConf === 'not_found') skipped.push(`venue (confidence ${venueConf})`);
            else createVenue = true;
        }
        if (tier3?.hotels?.length) {
            if (convention.hotels.length > 0) skipped.push('hotels (convention already has hotels)');
            else if (hotelConf === 'low' || hotelConf === 'not_found') skipped.push(`hotels (confidence ${hotelConf})`);
            else createHotels = true;
        }
        if (tier3?.guestsStayAtPrimaryVenue != null && convention.guestsStayAtPrimaryVenue !== tier3.guestsStayAtPrimaryVenue) {
            update.guestsStayAtPrimaryVenue = tier3.guestsStayAtPrimaryVenue;
            changes.push({ field: 'guestsStayAtPrimaryVenue', from: convention.guestsStayAtPrimaryVenue, to: tier3.guestsStayAtPrimaryVenue, reason: 'tier3' });
        }

        await prisma.$transaction(async tx => {
            if (Object.keys(update).length > 0) {
                await tx.convention.update({ where: { id: convention.id }, data: update });
            }

            if (createVenue && tier3?.venue) {
                const v = tier3.venue;
                await tx.venue.create({
                    data: {
                        conventionId: convention.id,
                        isPrimaryVenue: true,
                        venueName: v.name,
                        description: v.description,
                        websiteUrl: v.websiteUrl,
                        googleMapsUrl: v.googleMapsUrl,
                        streetAddress: v.streetAddress,
                        city: v.city,
                        stateRegion: v.stateRegion,
                        postalCode: v.postalCode,
                        country: v.country,
                        contactEmail: v.contactEmail,
                        contactPhone: v.contactPhone,
                        amenities: v.amenities ?? [],
                        parkingInfo: v.parkingInfo,
                        publicTransportInfo: v.publicTransportInfo,
                        overallAccessibilityNotes: v.accessibilityNotes,
                    },
                });
                venueHotelCreated++;
                changes.push({ field: 'venue', from: null, to: v.name, reason: 'tier3' });
            }

            if (createHotels && tier3?.hotels) {
                for (let i = 0; i < tier3.hotels.length; i++) {
                    const h = tier3.hotels[i];
                    await tx.hotel.create({
                        data: {
                            conventionId: convention.id,
                            isPrimaryHotel: h.isPrimary ?? i === 0,
                            isAtPrimaryVenueLocation: h.isAtVenue ?? false,
                            hotelName: h.name,
                            description: h.description,
                            websiteUrl: h.websiteUrl,
                            streetAddress: h.streetAddress,
                            city: h.city,
                            stateRegion: h.stateRegion,
                            postalCode: h.postalCode,
                            country: h.country,
                            contactEmail: h.contactEmail,
                            contactPhone: h.contactPhone,
                            groupRateOrBookingCode: h.groupRateOrBookingCode,
                            groupPrice: h.groupPrice,
                            bookingLink: h.bookingLink,
                            bookingCutoffDate: h.bookingCutoffDate,
                            amenities: h.amenities ?? [],
                            parkingInfo: h.parkingInfo,
                            publicTransportInfo: h.publicTransportInfo,
                            overallAccessibilityNotes: h.accessibilityNotes,
                        },
                    });
                    venueHotelCreated++;
                    changes.push({ field: 'hotel', from: null, to: h.name, reason: 'tier3' });
                }
            }

            for (const t of tierCreates) {
                const created = await tx.priceTier.create({
                    data: { conventionId: convention.id, ...t },
                });
                pricingCreated++;
                // The DB allows one discount per (tier, cutoff date); if the
                // extraction lists several, keep the first.
                const seenCutoffs = new Set<number>();
                for (const d of tier2?.priceDiscounts ?? []) {
                    if (d.cutoffDate && seenCutoffs.has(d.cutoffDate.getTime())) continue;
                    if (d.tierLabel === t.label && d.cutoffDate) {
                        seenCutoffs.add(d.cutoffDate.getTime());
                        await tx.priceDiscount.create({
                            data: {
                                conventionId: convention.id,
                                priceTierId: created.id,
                                cutoffDate: d.cutoffDate,
                                discountedAmount: d.discountedAmount,
                            },
                        });
                        pricingCreated++;
                    }
                }
            }

            if (tier2?.currency) {
                await tx.conventionSetting.upsert({
                    where: { conventionId_key: { conventionId: convention.id, key: 'currency' } },
                    update: { value: tier2.currency },
                    create: { conventionId: convention.id, key: 'currency', value: tier2.currency },
                });
            }

            // Provenance: which fields enrichment owns, plus a capped run log.
            await tx.conventionSetting.upsert({
                where: { conventionId_key: { conventionId: convention.id, key: ENRICHMENT_FIELDS_KEY } },
                update: { value: JSON.stringify(Array.from(enrichedFields)) },
                create: { conventionId: convention.id, key: ENRICHMENT_FIELDS_KEY, value: JSON.stringify(Array.from(enrichedFields)) },
            });

            const logSetting = convention.settings.find(s => s.key === ENRICHMENT_LOG_KEY);
            const log = logSetting ? JSON.parse(logSetting.value) : [];
            log.unshift({
                at: new Date().toISOString(),
                model: meta.model ?? null,
                sourcePages: meta.sourcePages,
                confidence: meta.fieldConfidence,
                notes: meta.notes,
                changes,
                skipped,
                pricingRecordsCreated: pricingCreated,
                venueHotelRecordsCreated: venueHotelCreated,
            });
            const value = JSON.stringify(log.slice(0, MAX_LOG_ENTRIES));
            await tx.conventionSetting.upsert({
                where: { conventionId_key: { conventionId: convention.id, key: ENRICHMENT_LOG_KEY } },
                update: { value },
                create: { conventionId: convention.id, key: ENRICHMENT_LOG_KEY, value },
            });
        });

        revalidatePath('/');
        revalidatePath('/conventions');
        revalidatePath(`/conventions/${convention.slug}`);

        return NextResponse.json({
            convention: { id: convention.id, slug: convention.slug, name: convention.name },
            applied: changes,
            skipped,
            pricingRecordsCreated: pricingCreated,
            venueHotelRecordsCreated: venueHotelCreated,
        });
    } catch (error) {
        console.error('Agent API: error enriching convention:', error);
        return NextResponse.json({ error: 'Could not enrich convention' }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = checkAgentApiKey(request);
    if (authError) return authError;

    const convention = await prisma.convention.findFirst({
        where: { OR: [{ id: params.id }, { slug: params.id }], deletedAt: null },
        include: {
            priceTiers: { orderBy: { order: 'asc' } },
            settings: true,
        },
    });
    if (!convention) {
        return NextResponse.json({ error: 'Convention not found' }, { status: 404 });
    }
    return NextResponse.json({ convention });
}
