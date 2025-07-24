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
  ListItemText,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import eventBus from '@/lib/event-bus';
import { getS3ImageUrl } from '@/lib/defaults';
import { Role } from '@prisma/client';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

export default function Header() {
  const { data: session, status } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [imageUrl, setImageUrl] = useState<string | null | undefined>();
  const [manageMenuAnchor, setManageMenuAnchor] = useState<null | HTMLElement>(null);
  const [myStuffMenuAnchor, setMyStuffMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [talentProfileActive, setTalentProfileActive] = useState(session?.user?.talentProfile?.isActive ?? false);

  const isAuthenticated = status === 'authenticated';
  const userRoles = session?.user?.roles || [];

  const isOrganizer = isAuthenticated && userRoles.includes(Role.ORGANIZER);
  const isBrandCreator = isAuthenticated && userRoles.includes(Role.BRAND_CREATOR);
  const hasTalentProfile = isAuthenticated && userRoles.includes(Role.TALENT);
  const hasActiveTalentProfile = isAuthenticated && talentProfileActive;

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

  // Listen for talent profile activation changes
  useEffect(() => {
    const handleTalentProfileUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.isActive === 'boolean') {
        setTalentProfileActive(event.detail.isActive);
      }
    };

    window.addEventListener('talentProfileUpdated', handleTalentProfileUpdate as EventListener);
    return () => {
      window.removeEventListener('talentProfileUpdated', handleTalentProfileUpdate as EventListener);
    };
  }, []);

  // Update local state when session changes
  useEffect(() => {
    setTalentProfileActive(session?.user?.talentProfile?.isActive ?? false);
  }, [session?.user?.talentProfile?.isActive]);

  const handleMenuOpen = (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => (event: React.MouseEvent<HTMLElement>) => {
    setter(event.currentTarget);
  };

  const handleMenuClose = (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => () => {
    setter(null);
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const showManageMenu = isOrganizer || isBrandCreator || hasTalentProfile;

  const MobileDrawerContent = () => (
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
        <IconButton onClick={handleMobileMenuClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/conventions" onClick={handleMobileMenuClose}>
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
                    <ListItemButton component={Link} href="/organizer/conventions" onClick={handleMobileMenuClose} sx={{ pl: 4 }}>
                      <ListItemText primary="Conventions" />
                    </ListItemButton>
                  </ListItem>
                )}
                {isBrandCreator && (
                  <ListItem disablePadding>
                    <ListItemButton component={Link} href="/brands/new" onClick={handleMobileMenuClose} sx={{ pl: 4 }}>
                      <ListItemText primary="Brand" />
                    </ListItemButton>
                  </ListItem>
                )}
                {hasTalentProfile && (
                  <ListItem disablePadding>
                    <ListItemButton component={Link} href="/profile?tab=talent" onClick={handleMobileMenuClose} sx={{ pl: 4 }}>
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
              <ListItemButton component={Link} href={`/u/${session?.user?.id}`} onClick={handleMobileMenuClose} sx={{ pl: 4 }}>
                <ListItemText primary="My Profile" />
              </ListItemButton>
            </ListItem>
            {hasActiveTalentProfile && (
              <ListItem disablePadding>
                <ListItemButton component={Link} href={`/t/${session?.user?.talentProfile?.id}`} onClick={handleMobileMenuClose} sx={{ pl: 4 }}>
                  <ListItemText primary="My Talent Profile" />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/profile?tab=settings" onClick={handleMobileMenuClose} sx={{ pl: 4 }}>
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>

            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/login" onClick={handleMobileMenuClose}>
              <ListItemText primary="Sign in/Sign Up" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" sx={{ backgroundColor: '#01264b' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 4 } }}>
        <Box component={Toolbar} disableGutters>
          <Box sx={{ flexGrow: 1, py: '10px' }}>
            <Link href="/">
              <img
                src={getS3ImageUrl('/images/defaults/convention-crasher-logo.png')}
                alt="Convention Crasher Logo"
                width={isMobile ? "120" : "150"}
                height={isMobile ? "62" : "77"}
                style={{ display: 'block' }}
              />
            </Link>
          </Box>

          {isMobile ? (
            // Mobile Layout
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isAuthenticated && (
                <IconButton component={Link} href={`/u/${session?.user?.id}`} sx={{ p: 0 }}>
                  {imageUrl ? (
                    <Avatar alt="Profile" src={getS3ImageUrl(imageUrl)} sx={{ width: 32, height: 32 }} />
                  ) : (
                    <AccountCircle sx={{ color: 'white', fontSize: 32 }} />
                  )}
                </IconButton>
              )}
              <IconButton
                color="inherit"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            // Desktop Layout
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
                    <MenuItem component={Link} href={`/u/${session?.user?.id}`} onClick={handleMenuClose(setMyStuffMenuAnchor)}>
                      My Profile
                    </MenuItem>
                    {hasActiveTalentProfile && (
                      <MenuItem component={Link} href={`/t/${session?.user?.talentProfile?.id}`} onClick={handleMenuClose(setMyStuffMenuAnchor)}>
                        My Talent Profile
                      </MenuItem>
                    )}
                    <MenuItem component={Link} href="/profile?tab=settings" onClick={handleMenuClose(setMyStuffMenuAnchor)}>
                      Settings
                    </MenuItem>
                  </Menu>

                  <Button color="inherit" onClick={handleLogout} sx={{ mr: 1 }}>
                    Sign Out
                  </Button>

                  <IconButton component={Link} href={`/u/${session?.user?.id}`} sx={{ p: 0, ml: 1 }}>
                    {imageUrl ? (
                      <Avatar alt="Profile" src={getS3ImageUrl(imageUrl)} />
                    ) : (
                      <AccountCircle sx={{ color: 'white', fontSize: 40 }} />
                    )}
                  </IconButton>
                </>
              ) : (
                <>
                  <Button color="inherit" component={Link} href="/login" sx={{ mr: 1 }}>
                    Sign in/Sign Up
                  </Button>
                  <AccountCircle sx={{ color: 'white', fontSize: 40 }} />
                </>
              )}
            </Box>
          )}
        </Box>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
      >
        <MobileDrawerContent />
      </Drawer>
    </AppBar>
  );
} 