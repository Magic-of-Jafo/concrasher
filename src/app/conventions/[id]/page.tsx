import { notFound } from 'next/navigation';
import ConventionDetailClient from './ConventionDetailClient';
import { getConventionDetailsByIdWithRelations, db } from '@/lib/db';

interface ConventionDetailPageProps {
  params: {
    id: string;
  };
}

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

    return <ConventionDetailClient convention={populatedConvention} />;
  } catch (error) {
    console.error('Error loading convention detail page:', error);
    notFound();
  }
} 