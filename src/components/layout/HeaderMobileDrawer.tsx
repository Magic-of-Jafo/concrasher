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

// Shared House Lights styling so the drawer reads as part of the themed site
// (see globals.css --cc-* tokens). Fallbacks keep it legible if a token is missing.
const itemSx = {
  color: 'var(--cc-ink, #dfd0b8)',
  '& .MuiListItemText-primary': { fontSize: '0.95rem' },
  '&:hover': { bgcolor: 'var(--cc-panel, rgba(255,255,255,0.06))' },
};

const subItemSx = {
  ...itemSx,
  pl: 4,
  '& .MuiListItemText-primary': { fontSize: '0.9rem', color: 'var(--cc-muted, #b9ad99)' },
};

const dividerSx = { borderColor: 'var(--cc-panel-border, rgba(148,137,121,0.5))' };

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
      slotProps={{
        paper: {
          sx: {
            width: 280,
            bgcolor: 'var(--cc-bg, #222831)',
            color: 'var(--cc-ink, #dfd0b8)',
            backgroundImage: 'none', // kill MUI dark-mode elevation overlay
            borderLeft: '1px solid var(--cc-panel-border, rgba(148,137,121,0.5))',
          },
        },
      }}
    >
      <Box>
        {/* Top block echoes the masthead bar so the drawer feels like it slid out of the header. */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 2,
            bgcolor: 'var(--cc-header-bg, #1a1f26)',
            color: 'var(--cc-header-ink, #dfd0b8)',
            borderBottom: '1px solid var(--cc-header-border, rgba(148,137,121,0.35))',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {isAuthenticated && (
              <>
                <Avatar alt="Profile" src={getS3ImageUrl(imageUrl) || undefined} sx={{ width: 40, height: 40 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session?.user?.name || 'User'}
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session?.user?.email}
                  </Box>
                </Box>
              </>
            )}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'var(--cc-header-ink, #dfd0b8)', flexShrink: 0 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ py: 1 }}>
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/conventions" onClick={onClose} sx={itemSx}>
              <ListItemText primary="All Conventions" />
            </ListItemButton>
          </ListItem>

          {isAuthenticated ? (
            <>
              <Divider sx={{ ...dividerSx, my: 1 }} />
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--cc-soft, #8a8d94)',
                }}
              >
                Account
              </Box>

              <ListItem disablePadding>
                <ListItemButton component={Link} href="/profile" onClick={onClose} sx={subItemSx}>
                  <ListItemText primary="Profile" />
                </ListItemButton>
              </ListItem>

              {isOrganizer && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=organizer" onClick={onClose} sx={subItemSx}>
                    <ListItemText primary="My Conventions" />
                  </ListItemButton>
                </ListItem>
              )}

              {hasActiveTalentProfile && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=talent" onClick={onClose} sx={subItemSx}>
                    <ListItemText primary="Talent Profile" />
                  </ListItemButton>
                </ListItem>
              )}

              {isBrandCreator && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=brands" onClick={onClose} sx={subItemSx}>
                    <ListItemText primary="My Brands" />
                  </ListItemButton>
                </ListItem>
              )}

              {isAdmin && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/profile?tab=admin" onClick={onClose} sx={subItemSx}>
                    <ListItemText primary="Admin Panel" />
                  </ListItemButton>
                </ListItem>
              )}

              <Divider sx={{ ...dividerSx, my: 1 }} />

              {userId && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/u/${userId}`} target="_blank" rel="noopener noreferrer" onClick={onClose} sx={subItemSx}>
                    <ListItemText primary="View Public Profile" />
                  </ListItemButton>
                </ListItem>
              )}
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/profile?tab=settings" onClick={onClose} sx={subItemSx}>
                  <ListItemText primary="Account Settings" />
                </ListItemButton>
              </ListItem>

              <Divider sx={{ ...dividerSx, my: 1 }} />
              <ListItem disablePadding>
                <ListItemButton onClick={onLogout} sx={{ ...itemSx, '& .MuiListItemText-primary': { fontSize: '0.95rem', fontWeight: 600 } }}>
                  <ListItemText primary="Sign Out" />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/login"
                onClick={onClose}
                sx={{ ...itemSx, '& .MuiListItemText-primary': { fontSize: '0.95rem', fontWeight: 700 } }}
              >
                <ListItemText primary="Sign in / Sign Up" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Box>
    </Drawer>
  );
}
