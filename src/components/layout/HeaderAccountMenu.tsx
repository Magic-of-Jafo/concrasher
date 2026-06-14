'use client';

import React from 'react';
import { Menu, MenuItem, Divider, ListItemIcon } from '@mui/material';
import Link from 'next/link';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

interface HeaderAccountMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  session: any;
  isOrganizer: boolean;
  isAdmin: boolean;
  isBrandCreator: boolean;
  hasActiveTalentProfile: boolean;
  onLogout: () => void;
}

export default function HeaderAccountMenu({
  anchorEl,
  onClose,
  session,
  isOrganizer,
  isAdmin,
  isBrandCreator,
  hasActiveTalentProfile,
  onLogout,
}: HeaderAccountMenuProps) {
  const userId = session?.user?.id;

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MenuItem component={Link} href="/profile" onClick={onClose}>
        <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
        Profile
      </MenuItem>

      {isOrganizer && (
        <MenuItem component={Link} href="/profile?tab=organizer" onClick={onClose}>
          <ListItemIcon><EventIcon fontSize="small" /></ListItemIcon>
          My Conventions
        </MenuItem>
      )}

      {hasActiveTalentProfile && (
        <MenuItem component={Link} href="/profile?tab=talent" onClick={onClose}>
          <ListItemIcon><TheaterComedyIcon fontSize="small" /></ListItemIcon>
          Talent Profile
        </MenuItem>
      )}

      {isBrandCreator && (
        <MenuItem component={Link} href="/profile?tab=brands" onClick={onClose}>
          <ListItemIcon><StorefrontIcon fontSize="small" /></ListItemIcon>
          My Brands
        </MenuItem>
      )}

      {isAdmin && (
        <MenuItem component={Link} href="/profile?tab=admin" onClick={onClose}>
          <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
          Admin Panel
        </MenuItem>
      )}

      <Divider />

      {userId && (
        <MenuItem component={Link} href={`/u/${userId}`} onClick={onClose}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          View Public Profile
        </MenuItem>
      )}
      <MenuItem component={Link} href="/profile?tab=settings" onClick={onClose}>
        <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
        Account Settings
      </MenuItem>

      <Divider />

      <MenuItem onClick={() => { onClose(); onLogout(); }}>
        <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
        Sign Out
      </MenuItem>
    </Menu>
  );
}
