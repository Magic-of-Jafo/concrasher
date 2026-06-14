'use client';

import React from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Avatar,
} from '@mui/material';
import Link from 'next/link';
import CloseIcon from '@mui/icons-material/Close';
import { getS3ImageUrl } from '@/lib/defaults';

interface HeaderMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  session: any;
  imageUrl: string | null | undefined;
  isOrganizer: boolean;
  isAdmin: boolean;
  isBrandCreator: boolean;
  hasActiveTalentProfile: boolean;
  onLogout: () => void;
}

export default function HeaderMobileDrawer({
  open,
  onClose,
  isAuthenticated,
  session,
  imageUrl,
  isOrganizer,
  isAdmin,
  isBrandCreator,
  hasActiveTalentProfile,
  onLogout,
}: HeaderMobileDrawerProps) {
  const userId = session?.user?.id;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1300 }}
    >
      <Box sx={{ width: 280, pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isAuthenticated && (
              <>
                <Avatar alt="Profile" src={getS3ImageUrl(imageUrl) || undefined} sx={{ width: 40, height: 40 }} />
                <Box>
                  <Box sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>
                    {session?.user?.name || 'User'}
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {session?.user?.email}
                  </Box>
                </Box>
              </>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/conventions" onClick={onClose}>
              <ListItemText primary="Advanced Search" />
            </ListItemButton>
          </ListItem>

          {isAuthenticated ? (
            <>
              <Divider sx={{ my: 1 }} />
              <ListItem disablePadding>
                <ListItemText primary="Account" sx={{ px: 2, py: 1, fontWeight: 'medium', fontSize: '0.875rem', color: 'text.secondary' }} />
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton component={Link} href="/profile" onClick={onClose} sx={{ pl: 4 }}>
                  <ListItemText primary="Profile" />
                </ListItemButton>
              </ListItem>

              {isOrganizer && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=organizer" onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemText primary="My Conventions" />
                  </ListItemButton>
                </ListItem>
              )}

              {hasActiveTalentProfile && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=talent" onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemText primary="Talent Profile" />
                  </ListItemButton>
                </ListItem>
              )}

              {isBrandCreator && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=brands" onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemText primary="My Brands" />
                  </ListItemButton>
                </ListItem>
              )}

              {isAdmin && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=admin" onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemText primary="Admin Panel" />
                  </ListItemButton>
                </ListItem>
              )}

              <Divider sx={{ my: 1 }} />

              {userId && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/u/${userId}`} onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemText primary="View Public Profile" />
                  </ListItemButton>
                </ListItem>
              )}
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/profile?tab=settings" onClick={onClose} sx={{ pl: 4 }}>
                  <ListItemText primary="Account Settings" />
                </ListItemButton>
              </ListItem>

              <Divider sx={{ my: 1 }} />
              <ListItem disablePadding>
                <ListItemButton onClick={onLogout}>
                  <ListItemText primary="Sign Out" />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login" onClick={onClose}>
                <ListItemText primary="Sign in/Sign Up" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Box>
    </Drawer>
  );
}
