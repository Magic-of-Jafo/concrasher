'use client';

import React from 'react';
import { Box, Avatar, Typography, Button, Chip, Container, IconButton } from '@mui/material';
import {
  Message as MessageIcon,
  PersonAdd as FollowIcon,
  Share as ShareIcon,
  Report as ReportIcon,
  Edit as EditIcon,
  AccountCircle,
  CalendarToday as CalendarIcon,
  TheaterComedy as TheaterIcon,
} from '@mui/icons-material';
import { Role } from '@prisma/client';
import { getS3ImageUrl } from '@/lib/defaults';
import { getUserDisplayName, formatRoleLabel } from '@/lib/user-utils';
import { DISPLAY, BODY } from '@/lib/fonts';

/**
 * Public member page (2026-07 redesign) — same card architecture as the talent
 * page, different graphic identity. The cue that tells a browser which page
 * they're on is pre-attentive, not structural:
 *
 *   TALENT — round avatar, gold ring, glow (a performer in a spotlight).
 *   MEMBER — rounded-square avatar, plain border, cyan room (a member badge).
 *
 * Shape + color register before any text is read.
 */

interface PublicUserProfileProps {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    stageName: string | null;
    useStageNamePublicly: boolean | null;
    bio: string | null;
    image: string | null;
    roles: Role[];
    createdAt: Date;
    talentProfile: {
      id: string;
      displayName: string;
      isActive: boolean;
    } | null;
  };
  currentUserId?: string | null;
}

const cardSx = {
  backgroundColor: 'var(--cc-panel)',
  border: '1px solid var(--cc-panel-border)',
  borderRadius: '12px',
  p: { xs: 2, sm: 3 },
} as const;

const cardTitleSx = {
  fontFamily: DISPLAY,
  fontWeight: 800,
  fontSize: '1.05rem',
  color: 'var(--cc-ink)',
  mb: 2,
} as const;

const roleChipSx = {
  borderRadius: '8px',
  height: 'auto',
  py: 0.3,
  backgroundColor: 'var(--cc-bg)',
  border: '1px solid var(--cc-panel-border)',
  color: 'var(--cc-muted)',
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: '0.66rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  '& .MuiChip-label': { px: 1.1 },
};

// The member badge: rounded square, plain border — deliberately NOT the talent
// page's glowing gold circle.
const memberAvatarSx = {
  width: { xs: 88, sm: 116 },
  height: { xs: 88, sm: 116 },
  borderRadius: '12px',
  border: '2px solid var(--cc-cyan)',
  backgroundColor: 'var(--cc-bg)',
  flexShrink: 0,
} as const;

const PublicUserProfile: React.FC<PublicUserProfileProps> = ({ user, currentUserId }) => {
  const displayName = getUserDisplayName(user);
  const isOwner = currentUserId === user.id;
  const talentActive = !!(user.talentProfile && user.talentProfile.isActive);

  const quietActions = [
    { icon: MessageIcon, label: 'Message' },
    { icon: FollowIcon, label: 'Follow' },
    { icon: ShareIcon, label: 'Share' },
    { icon: ReportIcon, label: 'Report' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'var(--cc-bg)', color: 'var(--cc-ink)', fontFamily: BODY, py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>

        {/* ============ Identity card ============
            Member wears its own base color (steel blue dark / cool blue wash
            light) under the shared metallic sheen — the at-a-glance cue for
            the profile type. */}
        <Box
          sx={{
            ...cardSx,
            mb: { xs: 2, sm: 3 },
            backgroundColor: 'var(--cc-id-member)',
            backgroundImage: 'var(--cc-id-sheen)',
          }}
        >
          <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {user.image ? (
              <Avatar variant="rounded" src={getS3ImageUrl(user.image)} sx={memberAvatarSx} />
            ) : (
              <Box sx={{ ...memberAvatarSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AccountCircle sx={{ fontSize: { xs: 52, sm: 68 }, color: 'var(--cc-soft)' }} />
              </Box>
            )}

            <Box sx={{ flex: 1, minWidth: 220 }}>
              {/* The cyan wordmark — quiet, no glow; the talent page's is gold and lit. */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: DISPLAY, fontSize: '0.72rem', fontWeight: 800,
                    letterSpacing: '0.26em', textTransform: 'uppercase',
                    color: 'var(--cc-cyan)',
                  }}
                >
                  Member
                </Typography>
                {isOwner && (
                  <IconButton
                    component="a"
                    href="/profile"
                    size="small"
                    aria-label="Edit profile"
                    sx={{ color: 'var(--cc-soft)', '&:hover': { color: 'var(--cc-cyan)' } }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Typography
                component="h1"
                sx={{
                  fontFamily: DISPLAY, fontWeight: 800, color: 'var(--cc-ink)',
                  fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1.15,
                  letterSpacing: '-0.015em', textWrap: 'balance', mt: 0.5,
                }}
              >
                {displayName}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {user.roles.filter((r) => r !== Role.USER).map((role) => (
                  <Chip key={role} label={formatRoleLabel(role)} size="small" sx={roleChipSx} />
                ))}
                <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-soft)' }}>
                  Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Action row — Talent CTA is the one gold element (points at the stage);
              the rest are quiet coming-soon affordances. */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 2.5 }}>
            {talentActive && (
              <Button
                variant="contained"
                component="a"
                href={`/t/${user.talentProfile!.id}`}
                startIcon={<TheaterIcon />}
                sx={{
                  backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)',
                  fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none',
                  '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.05)', boxShadow: 'none' },
                }}
              >
                View Talent Profile
              </Button>
            )}
            {quietActions.map((action) => (
              <Button
                key={action.label}
                variant="outlined"
                disabled
                startIcon={<action.icon />}
                sx={{
                  fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none', borderRadius: '8px',
                  '&.Mui-disabled': { borderColor: 'var(--cc-hairline)', color: 'var(--cc-soft)' },
                }}
              >
                {action.label}
              </Button>
            ))}
            <Typography sx={{ fontFamily: BODY, fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cc-soft)', ml: 0.5 }}>
              coming soon
            </Typography>
          </Box>
        </Box>

        {/* ============ Section cards ============ */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
          <Box sx={cardSx}>
            <Typography component="h2" sx={cardTitleSx}>About</Typography>
            {user.bio ? (
              <Typography
                component="div"  // bio HTML contains <p> tags; a <p> wrapper would nest <p> in <p> and break hydration
                sx={{ fontFamily: BODY, lineHeight: 1.7, color: 'var(--cc-ink)', maxWidth: '70ch', '& p': { margin: 0, mb: 1 }, '& p:last-child': { mb: 0 } }}
                dangerouslySetInnerHTML={{ __html: user.bio }}
              />
            ) : (
              <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                This member hasn&apos;t added a bio yet.
              </Typography>
            )}
          </Box>

          <Box sx={cardSx}>
            <Typography component="h2" sx={cardTitleSx}>Upcoming Conventions</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: '1rem', color: 'var(--cc-soft)' }} />
              <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                No upcoming convention appearances yet.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicUserProfile;
