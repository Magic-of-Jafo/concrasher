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

  // Ensure absolute URLs for images
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conventioncrasher.com';
  const coverImageUrl = convention.coverImageUrl
    ? convention.coverImageUrl.startsWith('http')
      ? convention.coverImageUrl
      : `${baseUrl}${convention.coverImageUrl}`
    : null;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: title,
      description: description,
      images: coverImageUrl ? [coverImageUrl] : [],
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

    // ✅ Fix: Serialize Decimal objects before passing to client component
    const serializedConvention = {
      ...populatedConvention,
      priceTiers: populatedConvention.priceTiers?.map((tier: any) => ({
        ...tier,
        amount: tier.amount.toNumber(), // Convert Decimal to number
      })),
      priceDiscounts: populatedConvention.priceDiscounts?.map((discount: any) => ({
        ...discount,
        discountedAmount: discount.discountedAmount.toNumber(), // Convert Decimal to number
      })),
    };

    // Ensure absolute URLs for images
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conventioncrasher.com';
    const coverImageUrl = convention.coverImageUrl
      ? convention.coverImageUrl.startsWith('http')
        ? convention.coverImageUrl
        : `${baseUrl}${convention.coverImageUrl}`
      : null;

    // Get primary venue for location details
    const primaryVenue = convention.venues?.find(v => v.isPrimaryVenue) || convention.venues?.[0];

    const eventJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: convention.name,
      startDate: convention.startDate?.toISOString(),
      endDate: convention.endDate?.toISOString(),
      eventStatus: mapConventionStatusToSchemaEventStatus(convention.status),
      description: convention.descriptionShort || convention.descriptionMain,
      image: coverImageUrl ? [coverImageUrl] : [],
      location: {
        '@type': 'Place',
        name: primaryVenue?.venueName || convention.venueName,
        address: {
          '@type': 'PostalAddress',
          streetAddress: primaryVenue?.streetAddress,
          addressLocality: primaryVenue?.city || convention.city,
          addressRegion: primaryVenue?.stateRegion || convention.stateAbbreviation,
          postalCode: primaryVenue?.postalCode,
          addressCountry: primaryVenue?.country || convention.country,
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
        name: convention.series?.name || convention.name,
        url: convention.websiteUrl,
      },
      provider: {
        '@type': 'Organization',
        name: 'Convention Crasher',
        url: 'https://conventioncrasher.com',
      },
    };

    return (
      <>
        {/* Event structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd, null, 2) }}
        />
        <ConventionDetailClient convention={serializedConvention} />
      </>
    );
  } catch (error) {
    console.error('Error loading convention detail page:', error);
    notFound();
  }
} 