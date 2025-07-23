import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Metadata } from 'next';
import PublicTalentProfile from './PublicTalentProfile';
import InactiveTalentProfile from './components/InactiveTalentProfile';

interface PublicTalentProfilePageProps {
    params: {
        identifier: string;
    };
}

export async function generateMetadata({ params }: PublicTalentProfilePageProps): Promise<Metadata> {
    const talentProfile = await db.talentProfile.findUnique({
        where: {
            id: params.identifier,
        },
        select: {
            displayName: true,
            tagline: true,
            bio: true,
        },
    });

    if (!talentProfile) {
        return {
            title: 'Talent Not Found',
        };
    }

    const cleanBio = talentProfile.bio?.replace(/<[^>]*>/g, '') || '';
    const description = talentProfile.tagline ||
        (cleanBio.length > 150 ? cleanBio.substring(0, 150) + '...' : cleanBio) ||
        `View ${talentProfile.displayName}'s talent profile`;

    return {
        title: `${talentProfile.displayName} - Talent Profile`,
        description,
        openGraph: {
            title: `${talentProfile.displayName} - Talent Profile`,
            description,
            type: 'profile',
        },
    };
}

export default async function PublicTalentProfilePage({ params }: PublicTalentProfilePageProps) {
    const talentProfile = await db.talentProfile.findUnique({
        where: {
            id: params.identifier,
        },
        select: {
            id: true,
            userId: true,
            displayName: true,
            tagline: true,
            bio: true,
            profilePictureUrl: true,
            websiteUrl: true,
            contactEmail: true,
            skills: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    roles: true,
                    createdAt: true,
                },
            },
            media: {
                orderBy: {
                    order: 'asc',
                },
            },
            conventions: {
                include: {
                    convention: {
                        select: {
                            id: true,
                            name: true,
                            startDate: true,
                            endDate: true,
                            city: true,
                            country: true,
                            status: true,
                        },
                    },
                },
                where: {
                    convention: {
                        status: 'PUBLISHED',
                        startDate: {
                            gte: new Date(), // Only future conventions
                        },
                    },
                },
                orderBy: {
                    convention: {
                        startDate: 'asc',
                    },
                },
            },
        },
    });

    if (!talentProfile) {
        notFound();
    }

    // If talent profile is inactive, show the inactive page
    if (!talentProfile.isActive) {
        return <InactiveTalentProfile user={talentProfile.user} />;
    }

    return <PublicTalentProfile talentProfile={talentProfile} />;
}

export const revalidate = 3600; // Revalidate every hour 