'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';

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
          My App
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isAuthenticated && session?.user?.email && (
            <Typography sx={{ mr: 2 }}>
              Logged in as: {session.user.email}
            </Typography>
          )}
          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} href="/profile" sx={{ mr: 1 }}>
                Profile
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
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