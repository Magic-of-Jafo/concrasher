import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserDisplayName } from '@/lib/user-utils';
import PublicUserProfile from './PublicUserProfile';

interface PublicUserProfilePageProps {
  params: {
    identifier: string;
  };
}

export async function generateMetadata({ params }: PublicUserProfilePageProps): Promise<Metadata> {
  const user = await db.user.findUnique({
    where: {
      id: params.identifier,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      stageName: true,
      useStageNamePublicly: true,
      bio: true,
    },
  });

  if (!user) {
    return {
      title: 'User Not Found',
    };
  }

  const displayName = getUserDisplayName(user);

  const cleanBio = user.bio?.replace(/<[^>]*>/g, '') || '';
  const description = cleanBio.length > 150
    ? cleanBio.substring(0, 150) + '...'
    : cleanBio || `View ${displayName}'s profile`;

  return {
    title: `${displayName} - Profile`,
    description,
    openGraph: {
      title: `${displayName} - Profile`,
      description,
      type: 'profile',
    },
  };
}

export default async function PublicUserProfilePage({ params }: PublicUserProfilePageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || null;

  const user = await db.user.findUnique({
    where: {
      id: params.identifier,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      stageName: true,
      useStageNamePublicly: true,
      bio: true,
      image: true,
      roles: true,
      createdAt: true,
      talentProfile: {
        select: {
          id: true,
          displayName: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return <PublicUserProfile user={user} currentUserId={currentUserId} />;
}

export const revalidate = 3600; // Revalidate every hour 