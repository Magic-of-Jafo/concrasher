'use client';

import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
  Chip,
  Container,
  Tabs,
  Tab,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Message as MessageIcon,
  PersonAdd as FollowIcon,
  Share as ShareIcon,
  Report as ReportIcon,
  Edit as EditIcon,
  AccountCircle,
} from '@mui/icons-material';
import { Role } from '@prisma/client';
import { getS3ImageUrl } from '@/lib/defaults';
import { getUserDisplayName, formatRoleLabel, getRoleColor } from '@/lib/user-utils';
import eventBus from '@/lib/event-bus';
import AboutTab from './components/AboutTab';
import UpcomingAppearancesTab from './components/UpcomingAppearancesTab';

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

const PublicUserProfile: React.FC<PublicUserProfileProps> = ({ user, currentUserId }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(user.image);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const displayName = getUserDisplayName(user);
  const isOwner = currentUserId === user.id;

  const quickActions = [
    { icon: MessageIcon, label: 'Message' },
    { icon: FollowIcon, label: 'Follow' },
    { icon: ShareIcon, label: 'Share' },
    { icon: ReportIcon, label: 'Report' },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleEditProfile = () => {
    // Navigate to user settings with basic info tab (default tab)
    window.location.href = `/profile`;
  };

  const handleImageUpdate = (url: string | null) => {
    setCurrentImageUrl(url);
    // Emit event to update header navigation icon
    eventBus.emit('profileImageChanged', url);
  };



  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Cover Image Area */}
      <Box
        sx={{
          height: { xs: 120, sm: 180 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
        }}
      />

      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Profile Type Indicator */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            mt: { xs: -6, sm: -8 },
            mb: 1,
          }}
        >
          <Chip
            label="User Profile"
            size="small"
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
          {user.talentProfile && user.talentProfile.isActive && (
            <Typography
              component="a"
              href={`/t/${user.talentProfile.id}`}
              variant="body2"
              sx={{
                color: '#ff6b35',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              View Talent Profile →
            </Typography>
          )}
        </Box>

        {/* Profile Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 3,
          }}
        >
          {/* Avatar */}
          {currentImageUrl ? (
            <Avatar
              src={getS3ImageUrl(currentImageUrl)}
              sx={{
                width: { xs: 100, sm: 150, md: 180 },
                height: { xs: 100, sm: 150, md: 180 },
                border: '4px solid white',
                boxShadow: 3,
                mb: 2,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 100, sm: 150, md: 180 },
                height: { xs: 100, sm: 150, md: 180 },
                border: '4px solid white',
                boxShadow: 3,
                mb: 2,
                borderRadius: '50%',
                bgcolor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 10,
              }}
            >
              <AccountCircle sx={{
                fontSize: { xs: 60, sm: 90, md: 110 },
                color: '#9e9e9e'
              }} />
            </Box>
          )}

          {/* Name and Roles */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <Typography
              variant="h4"
              component="h1"
              fontWeight="bold"
              textAlign="center"
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              {displayName}
            </Typography>
            {isOwner && (
              <IconButton
                onClick={handleEditProfile}
                size="small"
                sx={{
                  ml: 1,
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Role Badges */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
            {user.roles.filter(role => role !== Role.USER).map((role) => (
              <Chip
                key={role}
                label={formatRoleLabel(role)}
                color={getRoleColor(role)}
                size="small"
                variant="filled"
              />
            ))}
            {/* Special Talent Badge - only show when talent profile is active */}
            {user.talentProfile && user.talentProfile.isActive && (
              <Chip
                label="Talent"
                size="small"
                variant="filled"
                sx={{
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>

          {/* Member Since */}
          <Typography variant="body2" color="text.secondary">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </Typography>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
            Quick Actions
          </Typography>

          {/* Talent Profile Link - only show when active */}
          {user.talentProfile && user.talentProfile.isActive && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                component="a"
                href={`/t/${user.talentProfile.id}`}
                sx={{
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#e55a2e',
                  },
                }}
              >
                View Talent Profile
              </Button>
            </Box>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 1,
              mb: 2,
            }}
          >
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outlined"
                startIcon={<action.icon />}
                disabled={true}
                sx={{
                  py: 1,
                  fontSize: '0.875rem',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&.Mui-disabled': {
                    borderColor: 'divider',
                    color: 'text.secondary',
                  },
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              fontStyle: 'italic',
              fontSize: '0.875rem'
            }}
          >
            Coming Soon
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Tabbed Content */}
        <Box>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 3,
              '& .MuiTab-root': {
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 'auto',
                px: { xs: 1, sm: 2 },
              },
            }}
          >
            <Tab label="About" />
            <Tab label={isMobile ? "Appearances" : "Upcoming Appearances"} />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ pb: 4 }}>
            {currentTab === 0 && <AboutTab user={user} />}
            {currentTab === 1 && <UpcomingAppearancesTab userId={user.id} />}
          </Box>
        </Box>
      </Container>

      {/* Edit functionality moved to profile settings page */}
    </Box>
  );
};

export default PublicUserProfile; 