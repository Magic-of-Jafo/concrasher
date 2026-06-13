/**
 * One-off: apply FCM 2026's verified pricing grid to the LOCAL database so we
 * can preview the channel/tier/date display. Maps the grid the agent parsed
 * into our model:
 *   - tiers       = attendee categories (tier.amount = Weekly at-the-door price)
 *   - base channel = Weekly (channel='' dated discounts)
 *   - Daily        = a channel (channel='Daily' discounts; door price uses a
 *                    far-future cutoff so it sorts as the channel's regular)
 *   - month periods -> "good through" cutoff dates
 *
 * Local preview only. Run: node scripts/apply-fcm-pricing.mjs
 */
import { readFileSync } from 'fs';

if (!process.env.DATABASE_URL) {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    process.env.DATABASE_URL = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];
}
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const SLUG = 'fcm-international-convention-2026';
const DOOR_CUTOFF = new Date('2099-12-31T00:00:00Z'); // sentinel = "regular / at the door"
const C = (m, d) => new Date(Date.UTC(2026, m - 1, d)); // 2026 cutoff helper

// Verified grid. Each category: [weekly: [aprThru, junThru, julThru, door], daily: [...]]
const GRID = {
    'Member':            { weekly: [150, 170, 185, 200], daily: [45, 50, 55, 65] },
    'Member Spouse':     { weekly: [80, 90, 100, 115],   daily: [25, 30, 35, 40] },
    'Member Youth':      { weekly: [25, 30, 35, 40],      daily: [10, 12, 14, 20] },
    'Non Member':        { weekly: [185, 210, 225, 250],  daily: [50, 55, 60, 70] },
    'Non Member Spouse': { weekly: [105, 120, 130, 145],  daily: [35, 40, 45, 50] },
    'Non Member Youth':  { weekly: [35, 40, 45, 50],      daily: [15, 17, 20, 25] },
};
const PERIOD_CUTOFFS = [C(4, 30), C(6, 30), C(7, 31)]; // Until May 1, May-June, July

const convention = await prisma.convention.findUnique({ where: { slug: SLUG } });
if (!convention) { console.error('FCM 2026 not found'); process.exit(1); }
const conventionId = convention.id;

await prisma.$transaction(async (tx) => {
    // Clear existing pricing + related settings
    await tx.priceTier.deleteMany({ where: { conventionId } });
    await tx.conventionSetting.deleteMany({
        where: { conventionId, key: { in: ['baseChannelLabel', 'channelOrder', 'currency'] } },
    });

    let order = 0;
    for (const [category, prices] of Object.entries(GRID)) {
        const [, , , weeklyDoor] = prices.weekly;
        const tier = await tx.priceTier.create({
            data: { conventionId, label: category, amount: weeklyDoor, order: order++ },
        });

        // Weekly = base channel: dated discounts (channel='') for the 3 periods.
        for (let i = 0; i < PERIOD_CUTOFFS.length; i++) {
            await tx.priceDiscount.create({
                data: { conventionId, priceTierId: tier.id, channel: '', cutoffDate: PERIOD_CUTOFFS[i], discountedAmount: prices.weekly[i] },
            });
        }
        // Daily = channel: 3 dated periods + door price at the sentinel cutoff (its regular).
        for (let i = 0; i < PERIOD_CUTOFFS.length; i++) {
            await tx.priceDiscount.create({
                data: { conventionId, priceTierId: tier.id, channel: 'Daily', cutoffDate: PERIOD_CUTOFFS[i], discountedAmount: prices.daily[i] },
            });
        }
        await tx.priceDiscount.create({
            data: { conventionId, priceTierId: tier.id, channel: 'Daily', cutoffDate: DOOR_CUTOFF, discountedAmount: prices.daily[3] },
        });
    }

    const setting = (key, value) => tx.conventionSetting.create({ data: { conventionId, key, value } });
    await setting('currency', 'USD');
    await setting('baseChannelLabel', 'Weekly');
    await setting('channelOrder', JSON.stringify(['Weekly', 'Daily']));
});

const tiers = await prisma.priceTier.count({ where: { conventionId } });
const discounts = await prisma.priceDiscount.count({ where: { conventionId } });
console.log(`Applied FCM pricing: ${tiers} tiers, ${discounts} discounts.`);
await prisma.$disconnect();
