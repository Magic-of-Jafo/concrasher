'use client';

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Role } from '@prisma/client';
import { getUserDisplayName } from '@/lib/user-utils';

interface AboutTabProps {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    stageName: string | null;
    useStageNamePublicly: boolean | null;
    bio: string | null;
    roles: Role[];
    createdAt: Date;
  };
}

const AboutTab: React.FC<AboutTabProps> = ({ user }) => {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const displayName = getUserDisplayName(user);

  const showAlternateName = user.useStageNamePublicly && user.stageName && fullName;

  return (
    <Box>
      {/* Bio Section */}
      {user.bio && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            About
          </Typography>
          <Typography
            variant="body1"
            sx={{
              lineHeight: 1.6,
              '& p': { margin: 0, mb: 1 },
              '& p:last-child': { mb: 0 },
            }}
            dangerouslySetInnerHTML={{ __html: user.bio }}
          />
        </Box>
      )}

      {/* Name Information */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Profile Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Member Since
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Roles Section */}
      {user.roles.filter(role => role !== Role.USER).length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Roles & Permissions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {user.roles.filter(role => role !== Role.USER).map((role) => (
              <Chip
                key={role}
                label={role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {!user.bio && (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
            This user hasn't added a bio yet.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AboutTab; 