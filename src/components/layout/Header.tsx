'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import Link from 'next/link';
import eventBus from '@/lib/event-bus';
import { getS3ImageUrl } from '@/lib/defaults';
import { Role } from '@prisma/client';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AccountCircle from '@mui/icons-material/AccountCircle';

export default function Header() {
  const { data: session, status } = useSession();

  const [imageUrl, setImageUrl] = useState<string | null | undefined>();
  const [manageMenuAnchor, setManageMenuAnchor] = useState<null | HTMLElement>(null);
  const [myStuffMenuAnchor, setMyStuffMenuAnchor] = useState<null | HTMLElement>(null);

  const isAuthenticated = status === 'authenticated';
  const userRoles = session?.user?.roles || [];

  const isOrganizer = isAuthenticated && userRoles.includes(Role.ORGANIZER);
  const isBrandCreator = isAuthenticated && userRoles.includes(Role.BRAND_CREATOR);
  const hasTalentProfile = isAuthenticated && userRoles.includes(Role.TALENT);

  useEffect(() => {
    if (session?.user?.image !== undefined) {
      setImageUrl(session.user.image);
    }
  }, [session?.user?.image]);

  useEffect(() => {
    const handleImageUpdate = (newUrl: string | null) => {
      setImageUrl(newUrl);
    };
    eventBus.on('profileImageChanged', handleImageUpdate);
    return () => {
      eventBus.off('profileImageChanged', handleImageUpdate);
    };
  }, []);

  const handleMenuOpen = (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => (event: React.MouseEvent<HTMLElement>) => {
    setter(event.currentTarget);
  };

  const handleMenuClose = (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => () => {
    setter(null);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const showManageMenu = isOrganizer || isBrandCreator || hasTalentProfile;

  return (
    <AppBar position="static" sx={{ backgroundColor: '#01264b' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 4 } }}>
        <Box component={Toolbar} disableGutters>
          <Box sx={{ flexGrow: 1, py: '10px' }}>
            <Link href="/">
              <img
                src={getS3ImageUrl('/images/defaults/convention-crasher-logo.png')}
                alt="Convention Crasher Logo"
                style={{ width: '150px', height: 'auto', display: 'block' }}
              />
            </Link>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button color="inherit" component={Link} href="/conventions" sx={{ mr: 1 }}>
              Advanced Search
            </Button>

            {/* Manage Menu */}
            {showManageMenu && (
              <>
                <Button
                  color="inherit"
                  onClick={handleMenuOpen(setManageMenuAnchor)}
                  endIcon={<ArrowDropDownIcon />}
                >
                  Manage
                </Button>
                <Menu
                  anchorEl={manageMenuAnchor}
                  open={Boolean(manageMenuAnchor)}
                  onClose={handleMenuClose(setManageMenuAnchor)}
                >
                  {isOrganizer && (
                    <MenuItem component={Link} href="/organizer/conventions" onClick={handleMenuClose(setManageMenuAnchor)}>
                      Conventions
                    </MenuItem>
                  )}
                  {isBrandCreator && (
                    <MenuItem component={Link} href="/brands/new" onClick={handleMenuClose(setManageMenuAnchor)}>
                      Brand
                    </MenuItem>
                  )}
                  {hasTalentProfile && (
                    <MenuItem component={Link} href="/profile?tab=talent" onClick={handleMenuClose(setManageMenuAnchor)}>
                      Talent Profile
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}

            {/* My Stuff & Auth Actions */}
            {isAuthenticated ? (
              <>
                <Button
                  color="inherit"
                  onClick={handleMenuOpen(setMyStuffMenuAnchor)}
                  endIcon={<ArrowDropDownIcon />}
                >
                  My Stuff
                </Button>
                <Menu
                  anchorEl={myStuffMenuAnchor}
                  open={Boolean(myStuffMenuAnchor)}
                  onClose={handleMenuClose(setMyStuffMenuAnchor)}
                >
                  <MenuItem component={Link} href="/profile" onClick={handleMenuClose(setMyStuffMenuAnchor)}>
                    My Profile
                  </MenuItem>
                  <MenuItem component={Link} href="/profile?tab=settings" onClick={handleMenuClose(setMyStuffMenuAnchor)}>
                    Settings
                  </MenuItem>
                </Menu>

                <Button color="inherit" onClick={handleLogout} sx={{ mr: 1 }}>
                  Sign Out
                </Button>

                <IconButton component={Link} href="/profile" sx={{ p: 0, ml: 1 }}>
                  <Avatar alt="Profile" src={getS3ImageUrl(imageUrl) || undefined} />
                </IconButton>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} href="/login" sx={{ mr: 1 }}>
                  Sign in/Sign Up
                </Button>
                <AccountCircle sx={{ color: 'white' }} />
              </>
            )}
          </Box>
        </Box>
      </Container>
    </AppBar>
  );
} 