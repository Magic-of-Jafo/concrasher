// Restructure Magi-Whirl 2026 Online pricing into a flat channel table.
//
// Background: the original scrape stored each Online price as a PriceDiscount
// stamped with the real sale-end date (Sep 4/5/6). The editor expects a
// channel's flat table price to use the far-future sentinel date
// (2099-12-31), so the Online tab rendered blank and those rows leaked into
// the per-date "Discount Dates" list instead.
//
// This script:
//   1) Re-stamps every Online discount's cutoffDate to the sentinel, turning
//      them into the channel's flat "regular" prices (no dated discounts).
//   2) Bakes in the two tiers whose Online price equals the door price
//      (Capital Conjuror & Adult $50, Dealer $100) so the Online table is
//      complete (10 rows).
//
// Idempotent: re-running re-stamps already-sentinel rows (no-op) and skips
// tiers that already have an Online price.
//
// Run locally:  node scripts/restructure-magi-whirl-online.mjs
// Run on prod:  DATABASE_URL='<prod external url>' node scripts/restructure-magi-whirl-online.mjs

import { PrismaClient } from '@prisma/client';

const SENTINEL = new Date('2099-12-31T00:00:00Z');
const SLUG = 'magi-whirl-2026';
// Tiers whose online price is identical to the door price.
const SAME_AS_DOOR = ['Capital Conjuror & Adult', 'Dealer'];

const prisma = new PrismaClient();

async function main() {
  const convention = await prisma.convention.findFirst({
    where: { slug: SLUG },
    select: { id: true, name: true },
  });
  if (!convention) throw new Error(`Convention not found: ${SLUG}`);

  // 1) Flatten existing Online discounts onto the sentinel date.
  const restamp = await prisma.priceDiscount.updateMany({
    where: { conventionId: convention.id, channel: 'Online' },
    data: { cutoffDate: SENTINEL },
  });

  // 2) Bake in the tiers whose online price == door price.
  const tiers = await prisma.priceTier.findMany({
    where: { conventionId: convention.id },
    select: { id: true, label: true, amount: true },
  });
  const onlineRows = await prisma.priceDiscount.findMany({
    where: { conventionId: convention.id, channel: 'Online' },
    select: { priceTierId: true },
  });
  const haveOnline = new Set(onlineRows.map(r => r.priceTierId));

  const baked = [];
  for (const tier of tiers) {
    if (haveOnline.has(tier.id)) continue;
    if (!SAME_AS_DOOR.includes(tier.label)) continue;
    await prisma.priceDiscount.create({
      data: {
        conventionId: convention.id,
        priceTierId: tier.id,
        channel: 'Online',
        cutoffDate: SENTINEL,
        discountedAmount: tier.amount,
      },
    });
    baked.push(`${tier.label}=$${Number(tier.amount)}`);
  }

  const all = await prisma.priceDiscount.findMany({
    where: { conventionId: convention.id },
    select: { channel: true, cutoffDate: true },
  });
  const datedRemaining = all.filter(
    d => new Date(d.cutoffDate).getTime() !== SENTINEL.getTime()
  ).length;

  console.log(`${convention.name}: re-stamped ${restamp.count} Online rows to sentinel.`);
  console.log(`Baked in: ${baked.length ? baked.join(', ') : '(none needed)'}`);
  console.log(`Online rows: ${all.filter(d => d.channel === 'Online').length} | dated discounts remaining: ${datedRemaining}`);
}

main()
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
