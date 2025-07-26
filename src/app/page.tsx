import ConventionFeed from "@/components/features/ConventionFeed";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";
import { Metadata } from 'next';

async function getPublishedConventions() {
  try {
    const conventions = await db.convention.findMany({
      where: {
        status: ConventionStatus.PUBLISHED,
        deletedAt: null,
      },
      orderBy: {
        startDate: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
        city: true,
        stateName: true,
        stateAbbreviation: true,
        coverImageUrl: true,
        profileImageUrl: true,
        tags: true,
        series: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });
    return conventions;
  } catch (error) {
    console.error("Failed to fetch conventions:", error);
    // In case of a database error, return an empty array to prevent the page from crashing.
    return [];
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
  const conventions = await getPublishedConventions();
  return <ConventionFeed conventions={conventions} />;
}
