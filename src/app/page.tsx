import { readdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";
import { Metadata } from 'next';
import FrontPage from "@/components/frontpage/FrontPage";
import { MAJORS } from "@/components/frontpage/majors-config";
import { readMajorsSlots } from "@/lib/majors";
import type { MajorData } from "@/components/frontpage/FrontMajors";
import { HomeConvention, countryToRegion } from "@/components/home/home-types";
import { pickHeroMessage } from "@/components/home/headlines";

// Render against live data on each request. Without this, Next.js statically
// renders the home page at build time and freezes the convention list (and their
// image URLs) until the next deploy — so images uploaded on the live site after a
// deploy never appear on the cards.
export const dynamic = 'force-dynamic';

async function getUpcomingConventions(): Promise<{
  conventions: HomeConvention[];
  loadFailed: boolean;
}> {
  try {
    const rows = await db.convention.findMany({
      where: {
        status: ConventionStatus.PUBLISHED,
        deletedAt: null,
        startDate: { not: null },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
        city: true,
        stateName: true,
        stateAbbreviation: true,
        country: true,
        coverImageUrl: true,
        profileImageUrl: true,
        descriptionShort: true,
        // First gallery image: the Featured block leads with it (a real
        // event photo beats a logo); profile art remains the fallback.
        media: {
          where: { type: 'IMAGE' as const },
          orderBy: { order: 'asc' as const },
          take: 1,
          select: { url: true },
        },
      },
    });

    // Keep events that haven't ended yet (server-side; no client gate).
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conventions: HomeConvention[] = rows
      .filter((row) => {
        const end = row.endDate ?? row.startDate;
        if (!end) return false;
        const endDay = new Date(end);
        endDay.setHours(0, 0, 0, 0);
        return endDay.getTime() >= today.getTime();
      })
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        city: row.city,
        stateAbbreviation: row.stateAbbreviation,
        stateName: row.stateName,
        country: row.country,
        startDate: row.startDate ? row.startDate.toISOString() : null,
        endDate: row.endDate ? row.endDate.toISOString() : null,
        imageUrl: row.profileImageUrl || row.coverImageUrl || null,
        featuredImageUrl: row.media[0]?.url ?? null,
        descriptionShort: row.descriptionShort,
        region: countryToRegion(row.country),
      }));

    return { conventions, loadFailed: false };
  } catch (error) {
    console.error("Failed to fetch conventions:", error);
    // Surface an honest error state instead of masquerading as an empty list.
    return { conventions: [], loadFailed: true };
  }
}

export const metadata: Metadata = {
  title: 'Convention Crasher - Your Guide to Magic Conventions',
  description: 'Discover and explore magic conventions worldwide. Find your next magical experience with Convention Crasher.',
  openGraph: {
    type: 'website',
    url: 'https://conventioncrasher.com',
    title: 'Convention Crasher - Your Guide to Magic Conventions',
    description: 'Discover and explore magic conventions worldwide. Find your next magical experience with Convention Crasher.',
    images: [
      {
        url: 'https://convention-crasher.s3.us-east-1.amazonaws.com/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Convention Crasher - Magic Conventions Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Convention Crasher - Your Guide to Magic Conventions',
    description: 'Discover and explore magic conventions worldwide.',
    images: ['https://convention-crasher.s3.us-east-1.amazonaws.com/images/og-image.png'],
  },
};

const editionSelect = {
  id: true,
  name: true,
  slug: true,
  startDate: true,
  endDate: true,
  city: true,
  stateName: true,
  stateAbbreviation: true,
  country: true,
  coverImageUrl: true,
  profileImageUrl: true,
} as const;

type EditionRow = {
  id: string; name: string; slug: string | null;
  startDate: Date | null; endDate: Date | null;
  city: string | null; stateName: string | null; stateAbbreviation: string | null; country: string | null;
  coverImageUrl: string | null; profileImageUrl: string | null;
};

function toHomeConvention(row: EditionRow): HomeConvention {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    stateAbbreviation: row.stateAbbreviation,
    stateName: row.stateName,
    country: row.country,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    imageUrl: row.profileImageUrl || row.coverImageUrl || null,
    descriptionShort: null,
    region: countryToRegion(row.country),
  };
}

// The majors cards resolve through the convention SERIES: each slot shows its
// series' most recent edition, past or future. Upcoming = countdown, dateless
// TBD edition = "TBD", already passed = "Back next year" but still with the
// passed edition's artwork, so the card is never a blank tile. Slots come from
// the admin's saved list (label + series, any order/count) when one exists;
// otherwise the hardcoded name-matching defaults in majors-config.ts.
async function resolveMajorSlot(
  base: { key: string; short: string; descriptor: string; cadence: string },
  seriesId: string | null,
  nameMatch?: (name: string) => boolean,
): Promise<MajorData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    const isPast = (r: EditionRow) => {
      const end = new Date(r.endDate ?? r.startDate!);
      end.setHours(0, 0, 0, 0);
      return end.getTime() < today.getTime();
    };

    // PAST counts: since the auto-expire sweep started flipping finished
    // editions to PAST, a PUBLISHED-only filter would blank the card the
    // day after the convention ends (artwork and all).
    const editionStatuses = [ConventionStatus.PUBLISHED, ConventionStatus.PAST];
    let editions: EditionRow[] = [];
    if (seriesId) {
      editions = await db.convention.findMany({
        where: { seriesId, status: { in: editionStatuses }, deletedAt: null, startDate: { not: null } },
        orderBy: { startDate: "asc" },
        select: editionSelect,
      });
    } else if (nameMatch) {
      const rows = await db.convention.findMany({
        where: { status: { in: editionStatuses }, deletedAt: null, startDate: { not: null } },
        orderBy: { startDate: "asc" },
        select: editionSelect,
      });
      editions = rows.filter((r) => nameMatch(r.name));
    }

    // The chosen edition may not have artwork yet (imported future years
    // usually don't, and a just-finished year sometimes never got one).
    // Borrow from the nearest earlier edition that has art, so the slot
    // shows the series' identity instead of a blank monogram tile.
    const withArtFallback = (edition: ReturnType<typeof toHomeConvention>) => {
      if (edition.imageUrl) return edition;
      for (let i = editions.length - 1; i >= 0; i--) {
        const img = toHomeConvention(editions[i]).imageUrl;
        if (img) return { ...edition, imageUrl: img };
      }
      return edition;
    };

    // A series can hold several announced future years (the importer
    // grabs them); the card wants the SOONEST upcoming edition, not the
    // farthest-out one.
    const upcoming = editions.find((r) => !isPast(r));
    if (upcoming) {
      return { ...base, status: "upcoming", convention: withArtFallback(toHomeConvention(upcoming)) };
    }

    const latestPast = editions.length ? editions[editions.length - 1] : null;

    const tbd = seriesId
      ? await db.convention.findFirst({
          where: { seriesId, status: ConventionStatus.PUBLISHED, deletedAt: null, isTBD: true, startDate: null },
          orderBy: { createdAt: "desc" },
          select: editionSelect,
        })
      : null;
    if (tbd) {
      return { ...base, status: "tbd", convention: withArtFallback(toHomeConvention(tbd)) };
    }
    if (latestPast) {
      return { ...base, status: "past", convention: withArtFallback(toHomeConvention(latestPast)) };
    }
    return { ...base, status: "none", convention: null };
  } catch (error) {
    console.error(`Failed to resolve major slot ${base.key}:`, error);
    return { ...base, status: "none", convention: null };
  }
}

async function getMajors(): Promise<MajorData[]> {
  let seriesList: { id: string; name: string }[] = [];
  try {
    seriesList = await db.conventionSeries.findMany({ select: { id: true, name: true } });
  } catch (error) {
    console.error("Failed to fetch series for majors:", error);
  }

  // Admin-curated slots win; the hardcoded defaults only serve databases
  // where the admin never saved a configuration.
  const configured = await readMajorsSlots();
  if (configured) {
    const seriesNameById = new Map(seriesList.map((s) => [s.id, s.name]));
    return Promise.all(
      configured.map((slot) =>
        resolveMajorSlot(
          {
            key: slot.id,
            short: slot.label,
            descriptor: seriesNameById.get(slot.seriesId) || slot.label,
            cadence: "TBD",
          },
          slot.seriesId,
        ),
      ),
    );
  }

  return Promise.all(
    MAJORS.map((slot) =>
      resolveMajorSlot(
        { key: slot.key, short: slot.short, descriptor: slot.descriptor, cadence: slot.cadence },
        seriesList.find((s) => slot.match(s.name))?.id ?? null,
        slot.match,
      ),
    ),
  );
}

// Hero rotation, admin-lite edition: any image dropped into /public/hero joins
// the per-request random rotation immediately. Returns null (the designed
// stage-light scene renders instead) when the folder is empty or missing.
// The proper admin upload UI replaces this later.
async function pickHeroImage(): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "public", "hero");
    const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
    if (files.length === 0) return null;
    return `/hero/${files[Math.floor(Math.random() * files.length)]}`;
  } catch {
    return null;
  }
}

// The admin's Featured pool (set in /admin/conventions), stored comma-joined;
// '' or missing means automatic selection. One is chosen at random per load.
async function getFeaturedConventionIds(): Promise<string[]> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: 'featured_convention_id' } });
    return (row?.value || '').split(',').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function Home() {
  const { conventions, loadFailed } = await getUpcomingConventions();
  // Server-side picks: each request (the page is force-dynamic) gets one of
  // the objection-answering hero messages and one rotation image at random.
  const heroMessage = pickHeroMessage();
  const heroImage = await pickHeroImage();
  const majors = await getMajors();
  // Rotate the featured convention: pick one at random from the admin's pool
  // that is still live on the page (conventions is already upcoming-only).
  const featuredIds = await getFeaturedConventionIds();
  const featuredPool = featuredIds.filter((id) => conventions.some((c) => c.id === id));
  const featuredId = featuredPool.length
    ? featuredPool[Math.floor(Math.random() * featuredPool.length)]
    : null;
  return (
    <FrontPage
      conventions={conventions}
      loadFailed={loadFailed}
      heroMessage={heroMessage}
      heroImage={heroImage}
      majors={majors}
      featuredId={featuredId}
    />
  );
}
