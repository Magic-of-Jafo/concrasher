'use client';

import React from 'react';
import { Menu, MenuItem, Button } from '@mui/material';
import Link from 'next/link';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

interface HeaderMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onOpen: (event: React.MouseEvent<HTMLElement>) => void;
  isOrganizer: boolean;
  isBrandCreator: boolean;
  hasTalentProfile: boolean;
}

export default function HeaderMenu({
  anchorEl,
  onClose,
  onOpen,
  isOrganizer,
  isBrandCreator,
  hasTalentProfile,
}: HeaderMenuProps) {
  return (
    <>
      <Button
        color="inherit"
        onClick={onOpen}
        endIcon={<ArrowDropDownIcon />}
      >
        Manage
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
      >
        {isOrganizer && (
          <MenuItem component={Link} href="/organizer/conventions" onClick={onClose}>
            Conventions
          </MenuItem>
        )}
        {isBrandCreator && (
          <MenuItem component={Link} href="/brands/new" onClick={onClose}>
            Brand
          </MenuItem>
        )}
        {hasTalentProfile && (
          <MenuItem component={Link} href="/profile?tab=talent" onClick={onClose}>
            Talent Profile
          </MenuItem>
        )}
      </Menu>
    </>
  );
} 