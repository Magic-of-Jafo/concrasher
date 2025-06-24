'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Avatar from '@mui/material/Avatar';

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Button color="inherit" component={Link} href="/" sx={{ p: 0, minWidth: 0, fontWeight: 700, fontSize: '1.25rem', textTransform: 'none' }}>
            Convention Crasher
          </Button>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                <Avatar alt="Profile" src={session?.user?.image || undefined} />
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