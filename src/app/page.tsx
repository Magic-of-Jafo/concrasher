import ConventionFeed from "@/components/features/ConventionFeed";
import { db } from "@/lib/db";
import { ConventionStatus } from "@prisma/client";

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
      include: {
        series: true,
        // 'tags' was causing an error because it doesn't exist on the model.
      }
    });
    return conventions;
  } catch (error) {
    console.error("Failed to fetch conventions:", error);
    // In case of a database error, return an empty array to prevent the page from crashing.
    return [];
  }
}

export default async function Home() {
  const conventions = await getPublishedConventions();
  return <ConventionFeed conventions={conventions} />;
}
