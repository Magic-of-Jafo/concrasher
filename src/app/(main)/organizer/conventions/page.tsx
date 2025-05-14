'use client';

import { Button } from '@mui/material';
import Link from "next/link";

export default function OrganizerConventionsPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Button
        component={Link}
        href="/organizer/conventions/new"
        variant="contained"
        color="primary"
      >
        Create Convention
      </Button>
    </div>
  );
} 