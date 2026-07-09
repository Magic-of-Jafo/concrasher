import { readdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";
import { Metadata } from 'next';
import FrontPage from "@/components/frontpage/FrontPage";
import { MAJORS } from "@/components/frontpage/majors-config";
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

// The majors cards resolve through the convention SERIES: each slot finds its
// series (interim: name match; admin-assigned seriesId later) and shows that
// series' most recent edition, past or future. Upcoming = countdown, dateless
// TBD edition = "TBD", already passed = the cadence line ("Every summer") but
// still with the passed edition's artwork, so the card is never a blank tile.
async function getMajors(): Promise<MajorData[]> {
  let seriesList: { id: string; name: string }[] = [];
  try {
    seriesList = await db.conventionSeries.findMany({ select: { id: true, name: true } });
  } catch (error) {
    console.error("Failed to fetch series for majors:", error);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Promise.all(
    MAJORS.map(async (slot): Promise<MajorData> => {
      const base = { key: slot.key, short: slot.short, descriptor: slot.descriptor, cadence: slot.cadence };
      try {
        const series = seriesList.find((s) => slot.match(s.name));

        const isPast = (r: EditionRow) => {
          const end = new Date(r.endDate ?? r.startDate!);
          end.setHours(0, 0, 0, 0);
          return end.getTime() < today.getTime();
        };

        // Editions for this slot: by series when one matched, otherwise by
        // convention-name match (interim until admin series assignment).
        let editions: EditionRow[] = [];
        if (series) {
          editions = await db.convention.findMany({
            where: { seriesId: series.id, status: ConventionStatus.PUBLISHED, deletedAt: null, startDate: { not: null } },
            orderBy: { startDate: "asc" },
            select: editionSelect,
          });
        } else {
          const rows = await db.convention.findMany({
            where: { status: ConventionStatus.PUBLISHED, deletedAt: null, startDate: { not: null } },
            orderBy: { startDate: "asc" },
            select: editionSelect,
          });
          editions = rows.filter((r) => slot.match(r.name));
        }

        // A series can hold several announced future years (the importer
        // grabs them); the card wants the SOONEST upcoming edition, not the
        // farthest-out one.
        const upcoming = editions.find((r) => !isPast(r));
        if (upcoming) {
          return { ...base, status: "upcoming", convention: toHomeConvention(upcoming) };
        }

        const latestPast = editions.length ? editions[editions.length - 1] : null;

        const tbd = series
          ? await db.convention.findFirst({
              where: { seriesId: series.id, status: ConventionStatus.PUBLISHED, deletedAt: null, isTBD: true, startDate: null },
              orderBy: { createdAt: "desc" },
              select: editionSelect,
            })
          : null;
        if (tbd) {
          const edition = toHomeConvention(tbd);
          // A TBD edition often has no artwork yet; borrow the last edition's.
          if (!edition.imageUrl && latestPast) edition.imageUrl = toHomeConvention(latestPast).imageUrl;
          return { ...base, status: "tbd", convention: edition };
        }
        if (latestPast) {
          return { ...base, status: "past", convention: toHomeConvention(latestPast) };
        }
        return { ...base, status: "none", convention: null };
      } catch (error) {
        console.error(`Failed to resolve major slot ${slot.key}:`, error);
        return { ...base, status: "none", convention: null };
      }
    }),
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

export default async function Home() {
  const { conventions, loadFailed } = await getUpcomingConventions();
  // Server-side picks: each request (the page is force-dynamic) gets one of
  // the objection-answering hero messages and one rotation image at random.
  const heroMessage = pickHeroMessage();
  const heroImage = await pickHeroImage();
  const majors = await getMajors();
  return (
    <FrontPage
      conventions={conventions}
      loadFailed={loadFailed}
      heroMessage={heroMessage}
      heroImage={heroImage}
      majors={majors}
    />
  );
}
