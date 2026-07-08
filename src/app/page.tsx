import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";
import { Metadata } from 'next';
import FrontPage from "@/components/frontpage/FrontPage";
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

export default async function Home() {
  const { conventions, loadFailed } = await getUpcomingConventions();
  // Server-side pick: each request (the page is force-dynamic) gets one of the
  // objection-answering hero messages at random.
  const heroMessage = pickHeroMessage();
  return <FrontPage conventions={conventions} loadFailed={loadFailed} heroMessage={heroMessage} />;
}
