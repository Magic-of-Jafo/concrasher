import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import ConventionDetailClient from './ConventionDetailClient';

interface ConventionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ConventionDetailPage({ params }: ConventionDetailPageProps) {
  const convention = await prisma.convention.findUnique({
    where: {
      slug: params.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      startDate: true,
      endDate: true,
      isTBD: true,
      isOneDayEvent: true,
      city: true,
      stateAbbreviation: true,
      stateName: true,
      country: true,
      venueName: true,
      descriptionMain: true,
      descriptionShort: true,
      coverImageUrl: true,
      profileImageUrl: true,
      websiteUrl: true,
      registrationUrl: true,
      createdAt: true,
      updatedAt: true,
      priceTiers: {
        select: {
          id: true,
          label: true,
          amount: true,
          order: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
      priceDiscounts: {
        select: {
          id: true,
          cutoffDate: true,
          priceTierId: true,
          discountedAmount: true,
        },
        orderBy: {
          cutoffDate: 'asc',
        },
      },
    },
  });

  if (!convention) {
    notFound();
  }

  return <ConventionDetailClient convention={convention} />;
} 