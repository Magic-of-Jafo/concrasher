'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Image from 'next/image';
import Avatar from '@mui/material/Avatar';
import eventBus from '@/lib/event-bus';
import { getS3ImageUrl } from '@/lib/defaults';

export default function Header() {
  const { data: session, status } = useSession();
  const [imageUrl, setImageUrl] = useState<string | null | undefined>();
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    // When the session initially loads, set the image url
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
  }, []); // Empty dependency array ensures this runs only on mount and unmount


  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ flexGrow: 1, py: '10px' }}>
          <Link href="/">
            <Image
              src="/images/defaults/convention-crasher-logo.png"
              alt="Convention Crasher Logo"
              width={150}
              height={38}
              priority
            />
          </Link>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isAuthenticated && session?.user?.roles?.includes('ADMIN') && (
            <Button color="inherit" component={Link} href="/admin/conventions" sx={{ mr: 1 }}>
              Manage Conventions
            </Button>
          )}
          {isAuthenticated && session?.user?.roles?.includes('ORGANIZER') && (
            <Button color="inherit" component={Link} href="/organizer/conventions" sx={{ mr: 1 }}>
              Dashboard
            </Button>
          )}
          {isAuthenticated ? (
            <>
              <Button color="inherit" onClick={handleLogout} sx={{ mr: 1 }}>
                Logout
              </Button>
              <Button color="inherit" component={Link} href="/profile" sx={{ p: 0, minWidth: 0 }}>
                <Avatar alt="Profile" src={getS3ImageUrl(imageUrl) || undefined} />
              </Button>
            </>
          ) : (
            <Button color="inherit" component={Link} href="/login">
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
} 