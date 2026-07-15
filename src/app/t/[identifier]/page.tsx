import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import PublicTalentProfile from './PublicTalentProfile';

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
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

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
                    stageName: true,
                    useStageNamePublicly: true,
                    roles: true,
                    createdAt: true,
                },
            },
            media: {
                orderBy: {
                    order: 'asc',
                },
            },
            // ALL published appearances — the ConventionTalent link is the
            // permanent record of where this person has performed. The
            // component splits them into upcoming vs. past for display.
            // isVisible mirrors the convention's own talent tab: a card the
            // organizer hid doesn't count as a public appearance.
            conventions: {
                include: {
                    convention: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            startDate: true,
                            endDate: true,
                            city: true,
                            country: true,
                            status: true,
                        },
                    },
                },
                where: {
                    isVisible: true,
                    convention: {
                        // PUBLISHED covers live listings; PAST is what organizers
                        // flip wrapped conventions to — both are real appearances.
                        status: { in: ['PUBLISHED', 'PAST'] },
                        deletedAt: null,
                        startDate: { not: null },
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

    // A deactivated (claimed) talent profile is hidden from fans and organizers:
    // anyone landing here sees the person's regular member profile instead.
    // (Unclaimed profiles have no user and default to active.)
    if (!talentProfile.isActive && talentProfile.user) {
        redirect(`/u/${talentProfile.user.id}`);
    }

    return <PublicTalentProfile talentProfile={talentProfile} currentUserId={currentUserId} />;
}

// Always render against live data: a talent who toggles their profile off must
// disappear immediately (redirect to their member page), never linger in a
// cached copy for up to an hour. The page already does a session + DB lookup.
export const dynamic = 'force-dynamic'; 