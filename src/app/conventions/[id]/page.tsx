import { notFound } from 'next/navigation';
import ConventionDetailClient from './ConventionDetailClient';
import { getConventionDetailsByIdWithRelations, db } from '@/lib/db';
import { Metadata } from 'next';
import { ConventionStatus } from '@prisma/client';

interface ConventionDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ConventionDetailPageProps): Promise<Metadata> {
  const convention = await db.convention.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
      deletedAt: null,
    },
    include: {
      series: true,
    },
  });

  if (!convention) {
    return {
      title: 'Convention Not Found',
    };
  }

  const seoSettings = await (db as any).sEOSetting.findUnique({
    where: { id: 'singleton' },
  });

  const siteTitleTemplate = seoSettings?.siteTitleTemplate || '%s';
  const title = siteTitleTemplate.replace('%s', convention.name);
  const description = convention.descriptionShort || convention.descriptionMain || seoSettings?.siteDescription || '';

  // Use only the convention's specific keywords, not the default ones
  const keywords = ((convention as any).keywords || []).filter(Boolean);

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: title,
      description: description,
      images: convention.coverImageUrl ? [convention.coverImageUrl] : [],
    },
  };
}

const mapConventionStatusToSchemaEventStatus = (status: ConventionStatus) => {
  switch (status) {
    case 'PUBLISHED':
      return 'https://schema.org/EventScheduled';
    case 'CANCELLED':
      return 'https://schema.org/EventCancelled';
    case 'DRAFT':
    case 'PAST':
    default:
      // While there isn't a direct schema for 'draft' or 'past', we can just omit it
      // or use the most neutral status. For a publicly visible page, it's likely 'Scheduled'.
      return 'https://schema.org/EventScheduled';
  }
};


// helper to populate dealer brand links
async function populateDealerLinks(convention: any) {
  if (!convention?.dealerLinks?.length) return convention;
  const populated = await Promise.all(
    convention.dealerLinks.map(async (dl: any) => {
      if (dl.profileType === 'BRAND') {
        const brand = await db.brand.findUnique({ where: { id: dl.linkedProfileId } });
        if (brand) {
          return {
            id: dl.id,
            displayNameOverride: dl.displayNameOverride,
            descriptionOverride: dl.descriptionOverride,
            profileType: dl.profileType,
            name: brand.name,
            profileImageUrl: brand.logoUrl,
            profileLink: `/brands/${brand.id}`,
          };
        }
      }
      return {
        id: dl.id,
        displayNameOverride: dl.displayNameOverride,
        descriptionOverride: dl.descriptionOverride,
        profileType: dl.profileType,
        name: dl.displayNameOverride || 'Dealer',
        profileImageUrl: null,
        profileLink: undefined,
      };
    })
  );
  return { ...convention, dealerLinks: populated };
}

export default async function ConventionDetailPage({ params }: ConventionDetailPageProps) {
  try {
    // Try to find convention by ID first, then by slug if not found
    let convention = await getConventionDetailsByIdWithRelations(params.id);

    if (!convention) {
      // Try finding by slug if ID lookup failed
      const conventionBySlug = await db.convention.findUnique({
        where: {
          slug: params.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (conventionBySlug) {
        convention = await getConventionDetailsByIdWithRelations(conventionBySlug.id);
      }
    }

    if (!convention) {
      notFound();
    }

    const populatedConvention = await populateDealerLinks(convention);

    const eventJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: convention.name,
      startDate: convention.startDate?.toISOString(),
      endDate: convention.endDate?.toISOString(),
      eventStatus: mapConventionStatusToSchemaEventStatus(convention.status),
      description: convention.descriptionShort || convention.descriptionMain,
      image: [convention.coverImageUrl].filter(Boolean),
      location: {
        '@type': 'Place',
        name: convention.venueName,
        address: {
          '@type': 'PostalAddress',
          streetAddress: convention.venues?.[0]?.streetAddress,
          addressLocality: convention.city,
          addressRegion: convention.stateAbbreviation,
          postalCode: convention.venues?.[0]?.postalCode,
          addressCountry: convention.country,
        },
      },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: convention.settings.find(s => s.key === 'currency')?.value || 'USD',
        lowPrice: convention.priceTiers?.length
          ? Math.min(...convention.priceTiers.map(p => p.amount.toNumber()))
          : 0,
        highPrice: convention.priceTiers?.length
          ? Math.max(...convention.priceTiers.map(p => p.amount.toNumber()))
          : 0,
        offers: convention.priceTiers?.map(tier => ({
          '@type': 'Offer',
          name: tier.label,
          price: tier.amount.toNumber(),
          priceCurrency: convention.settings.find(s => s.key === 'currency')?.value || 'USD',
          url: convention.registrationUrl,
          availability: 'https://schema.org/InStock',
        })),
      },
      organizer: {
        '@type': 'Organization',
        name: convention.series?.name || 'Organizer', // Fallback name
      },
    };

    return (
      <>
        {/* Event structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd, null, 2) }}
        />
        <ConventionDetailClient convention={populatedConvention} />
      </>
    );
  } catch (error) {
    console.error('Error loading convention detail page:', error);
    notFound();
  }
} 