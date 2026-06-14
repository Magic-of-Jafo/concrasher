// Phase 1 migration for the "independent tables per tab" pricing redesign.
//
// Converts the two conventions that use the old channel-on-discount model:
//
//   Magi-Whirl (same product, two channels) -> ONE table, two price columns:
//     - each tier's "Online" sentinel discount becomes tier.amountSecondary
//     - the Online discounts are deleted
//     - ConventionSetting secondaryChannelLabel = "Online" (primary stays
//       baseChannelLabel = "At the Door")
//
//   FCM (different products per tab) -> two independent tabs:
//     - existing 6 base tiers get tab = "Weekly" (their dated discounts stay)
//     - 6 new tiers are created with tab = "Daily", amount = the Daily sentinel
//       price; the Daily *dated* discounts are re-pointed onto these new tiers
//       (channel cleared); the Daily sentinels are deleted
//
// All other conventions already default to tab = "" (single table) — untouched.
//
// Idempotent: skips a convention if it already looks migrated.
//
// Local:  node scripts/migrate-pricing-tabs.mjs
// Prod:   DATABASE_URL='<prod>' node scripts/migrate-pricing-tabs.mjs

import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Prefer .env.local for local runs; an explicit DATABASE_URL (prod) wins.
if (!process.env.DATABASE_URL) loadEnv({ path: '.env.local' });
else loadEnv({ path: '.env.local', override: false });

const SENTINEL = new Date('2099-12-31T00:00:00Z');
const isSentinel = d => new Date(d).getTime() === SENTINEL.getTime();
const prisma = new PrismaClient();

async function setSetting(conventionId, key, value) {
  await prisma.conventionSetting.upsert({
    where: { conventionId_key: { conventionId, key } },
    create: { conventionId, key, value },
    update: { value },
  });
}

async function migrateMagiWhirl() {
  const c = await prisma.convention.findFirst({ where: { slug: 'magi-whirl-2026' }, select: { id: true, name: true } });
  if (!c) return console.log('Magi-Whirl: not found, skipping.');

  const tiers = await prisma.priceTier.findMany({ where: { conventionId: c.id } });
  if (tiers.some(t => t.amountSecondary !== null)) return console.log('Magi-Whirl: already migrated, skipping.');

  const online = await prisma.priceDiscount.findMany({ where: { conventionId: c.id, channel: 'Online' } });
  const byTier = new Map(online.map(d => [d.priceTierId, d]));

  let set = 0;
  for (const t of tiers) {
    const d = byTier.get(t.id);
    if (!d) continue; // tiers without an online price keep amountSecondary null
    await prisma.priceTier.update({ where: { id: t.id }, data: { amountSecondary: d.discountedAmount } });
    set++;
  }
  const del = await prisma.priceDiscount.deleteMany({ where: { conventionId: c.id, channel: 'Online' } });
  await setSetting(c.id, 'secondaryChannelLabel', 'Online');

  console.log(`Magi-Whirl: set amountSecondary on ${set} tiers, deleted ${del.count} Online discounts, secondaryChannelLabel=Online.`);
}

async function migrateFcm() {
  const c = await prisma.convention.findFirst({ where: { slug: 'fcm-international-convention-2026' }, select: { id: true, name: true } });
  if (!c) return console.log('FCM: not found, skipping.');

  const existingDaily = await prisma.priceTier.findMany({ where: { conventionId: c.id, tab: 'Daily' } });
  if (existingDaily.length) return console.log('FCM: Daily tab already exists, skipping.');

  // 1) Existing base tiers -> Weekly tab.
  const weeklyTiers = await prisma.priceTier.findMany({ where: { conventionId: c.id, tab: '' }, orderBy: { order: 'asc' } });
  await prisma.priceTier.updateMany({ where: { conventionId: c.id, tab: '' }, data: { tab: 'Weekly' } });

  // 2) Daily sentinels -> the flat Daily price for each category.
  const dailySentinels = await prisma.priceDiscount.findMany({
    where: { conventionId: c.id, channel: 'Daily', cutoffDate: SENTINEL },
  });
  const weeklyById = new Map(weeklyTiers.map(t => [t.id, t]));
  const oldToNew = new Map(); // weeklyTierId -> new Daily tierId

  for (const s of dailySentinels) {
    const wt = weeklyById.get(s.priceTierId);
    if (!wt) continue;
    const created = await prisma.priceTier.create({
      data: {
        conventionId: c.id,
        label: wt.label,
        amount: s.discountedAmount,
        order: wt.order,
        tab: 'Daily',
      },
    });
    oldToNew.set(s.priceTierId, created.id);
  }

  // 3) Re-point the Daily *dated* discounts onto the new Daily tiers (clear channel).
  const dailyDated = await prisma.priceDiscount.findMany({
    where: { conventionId: c.id, channel: 'Daily', NOT: { cutoffDate: SENTINEL } },
  });
  let repointed = 0;
  for (const d of dailyDated) {
    const newTierId = oldToNew.get(d.priceTierId);
    if (!newTierId) continue;
    await prisma.priceDiscount.update({ where: { id: d.id }, data: { priceTierId: newTierId, channel: '' } });
    repointed++;
  }

  // 4) Delete the now-redundant Daily sentinels.
  const del = await prisma.priceDiscount.deleteMany({ where: { conventionId: c.id, channel: 'Daily', cutoffDate: SENTINEL } });

  console.log(`FCM: Weekly tab set on ${weeklyTiers.length} tiers; created ${oldToNew.size} Daily tiers; re-pointed ${repointed} Daily dated discounts; deleted ${del.count} Daily sentinels.`);
}

async function main() {
  await migrateMagiWhirl();
  await migrateFcm();

  // Safety net: clear any remaining non-empty channel values (vestigial now).
  const leftover = await prisma.priceDiscount.updateMany({ where: { NOT: { channel: '' } }, data: { channel: '' } });
  if (leftover.count) console.log(`Cleared channel on ${leftover.count} leftover discounts.`);
}

main()
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
