'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import eventBus from '@/lib/event-bus';
import { getS3ImageUrl } from '@/lib/defaults';
import { Role } from '@prisma/client';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';

// Lazy load heavy components that are only used when menus are opened
const LazyMenu = lazy(() => import('./HeaderMenu'));
const LazyMyStuffMenu = lazy(() => import('./HeaderMyStuffMenu'));
const LazyMobileDrawer = lazy(() => import('./HeaderMobileDrawer'));

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

  // Show manage menu if user has organizer role or talent profile
  const showManageMenu = isOrganizer || hasTalentProfile;

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
                loading="eager"
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

              {/* Manage Menu - Lazy Loaded */}
              {showManageMenu && (
                <Suspense fallback={<Button color="inherit">Manage</Button>}>
                  <LazyMenu
                    anchorEl={manageMenuAnchor}
                    onClose={handleMenuClose(setManageMenuAnchor)}
                    onOpen={handleMenuOpen(setManageMenuAnchor)}
                    isOrganizer={isOrganizer}
                    isBrandCreator={isBrandCreator}
                    hasTalentProfile={hasTalentProfile}
                    session={session}
                  />
                </Suspense>
              )}

              {/* My Stuff Menu - Lazy Loaded */}
              {isAuthenticated && (
                <Suspense fallback={<Button color="inherit">My Stuff</Button>}>
                  <LazyMyStuffMenu
                    anchorEl={myStuffMenuAnchor}
                    onClose={handleMenuClose(setMyStuffMenuAnchor)}
                    onOpen={handleMenuOpen(setMyStuffMenuAnchor)}
                    session={session}
                    hasActiveTalentProfile={hasActiveTalentProfile}
                  />
                </Suspense>
              )}

              {/* Auth Actions */}
              {isAuthenticated ? (
                <>
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

      {/* Mobile Drawer - Lazy Loaded */}
      <Suspense fallback={null}>
        <LazyMobileDrawer
          open={mobileMenuOpen}
          onClose={handleMobileMenuClose}
          isAuthenticated={isAuthenticated}
          session={session}
          imageUrl={imageUrl}
          showManageMenu={showManageMenu}
          isOrganizer={isOrganizer}
          isBrandCreator={isBrandCreator}
          hasTalentProfile={hasTalentProfile}
          hasActiveTalentProfile={hasActiveTalentProfile}
          onLogout={handleLogout}
        />
      </Suspense>
    </AppBar>
  );
} 