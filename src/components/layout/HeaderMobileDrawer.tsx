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
  showManageMenu: boolean;
  isOrganizer: boolean;
  isBrandCreator: boolean;
  hasTalentProfile: boolean;
  hasActiveTalentProfile: boolean;
  onLogout: () => void;
}

export default function HeaderMobileDrawer({
  open,
  onClose,
  isAuthenticated,
  session,
  imageUrl,
  showManageMenu,
  isOrganizer,
  isBrandCreator,
  hasTalentProfile,
  hasActiveTalentProfile,
  onLogout,
}: HeaderMobileDrawerProps) {
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
              {showManageMenu && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <ListItem disablePadding>
                    <ListItemText primary="Manage" sx={{ px: 2, py: 1, fontWeight: 'medium', fontSize: '0.875rem', color: 'text.secondary' }} />
                  </ListItem>
                  {isOrganizer && (
                    <ListItem disablePadding>
                      <ListItemButton component={Link} href="/organizer/conventions" onClick={onClose} sx={{ pl: 4 }}>
                        <ListItemText primary="Conventions" />
                      </ListItemButton>
                    </ListItem>
                  )}
                  {isBrandCreator && (
                    <ListItem disablePadding>
                      <ListItemButton component={Link} href="/brands/new" onClick={onClose} sx={{ pl: 4 }}>
                        <ListItemText primary="Brand" />
                      </ListItemButton>
                    </ListItem>
                  )}
                  {hasTalentProfile && (
                    <ListItem disablePadding>
                      <ListItemButton component={Link} href="/profile?tab=talent" onClick={onClose} sx={{ pl: 4 }}>
                        <ListItemText primary="Talent Profile" />
                      </ListItemButton>
                    </ListItem>
                  )}
                </>
              )}

              <Divider sx={{ my: 1 }} />
              <ListItem disablePadding>
                <ListItemText primary="My Stuff" sx={{ px: 2, py: 1, fontWeight: 'medium', fontSize: '0.875rem', color: 'text.secondary' }} />
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton component={Link} href={`/u/${session?.user?.id}`} onClick={onClose} sx={{ pl: 4 }}>
                  <ListItemText primary="My Profile" />
                </ListItemButton>
              </ListItem>
              {hasActiveTalentProfile && (
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/t/${session?.user?.talentProfile?.id}`} onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemText primary="My Talent Profile" />
                  </ListItemButton>
                </ListItem>
              )}
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/profile" onClick={onClose} sx={{ pl: 4 }}>
                  <ListItemText primary="Settings" />
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