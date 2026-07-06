'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import {
  HomeConvention,
  HOUSE,
  ISLAND,
  DISPLAY_FONT,
  BODY_FONT,
  formatDateRange,
  formatLocation,
  getCountdown,
} from './home-types';

// The Big Four: the marquee conventions everyone in the community talks about.
// The band is the seam between the auditorium (hero) and the island (feed):
// the cards straddle the navy/white boundary, half in the house, half in the
// light. Each card wears Victorian card-back scrollwork in its own hue — the
// antique-playing-card language without a single suit pip. Cards link to their
// next listed edition when one is upcoming; otherwise they fall back to a
// static descriptor and the browse page.

// Engraved acanthus-scroll tile, tinted per card. Inline SVG so the hue can be
// injected; rendered very light under the content (the hue carries the eye,
// the ink carries the reading).
function damaskTile(hex: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='${hex}' stroke-width='1.8' stroke-linecap='round'><path d='M8 96 C24 60 56 52 80 64 C106 78 104 108 82 116 C66 122 52 112 56 98 C60 88 72 86 76 94'/><path d='M82 116 C96 128 118 130 134 120'/><path d='M118 44 C134 28 156 34 154 52 C152 66 136 70 130 60 C126 52 132 46 138 48'/><path d='M80 64 C84 48 98 40 118 44'/><path d='M40 30 C48 18 62 14 70 20 C64 30 52 34 40 30 Z'/><path d='M12 44 C20 36 32 34 40 30'/><path d='M96 150 C104 132 124 124 142 132 C156 138 156 152 144 156 C136 158 132 150 138 146'/><path d='M56 142 C68 134 84 136 96 150'/><path d='M10 118 C2 128 4 142 14 148 C22 140 22 128 10 118 Z'/><path d='M148 76 C158 82 160 94 152 102 C144 94 142 84 148 76 Z'/><path d='M28 66 C18 60 6 64 2 74'/><path d='M104 24 C98 14 86 10 76 14'/><circle cx='46' cy='118' r='2' fill='${hex}' stroke='none'/><circle cx='122' cy='70' r='2' fill='${hex}' stroke='none'/><circle cx='64' cy='40' r='2' fill='${hex}' stroke='none'/><circle cx='140' cy='108' r='2' fill='${hex}' stroke='none'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

interface Major {
  key: string;
  /** The name everyone uses. */
  short: string;
  /** Sub line when no upcoming edition is listed. */
  descriptor: string;
  /** Kicker when no upcoming edition is listed. */
  cadence: string;
  /** The card's scrollwork + kicker hue (AA-safe on Paper). */
  hue: string;
  match: (name: string) => boolean;
}

const MAJORS: Major[] = [
  {
    key: 'sam',
    short: 'S.A.M.',
    descriptor: 'Society of American Magicians',
    cadence: 'Every summer',
    hue: '#B3122E', // crimson
    // Dots or ALL-CAPS only, so "Sam" in an unrelated name can't match.
    match: (n) => /society of american/i.test(n) || /(^|[^A-Za-z])S\.?A\.?M\.(?![A-Za-z])/.test(n) || /\bSAM\b/.test(n),
  },
  {
    key: 'ibm',
    short: 'I.B.M.',
    descriptor: 'International Brotherhood of Magicians',
    cadence: 'Every summer',
    hue: '#1D4ED8', // cobalt
    match: (n) =>
      !/british ring/i.test(n) && (/international brotherhood/i.test(n) || /\bI\.?B\.?M\.?\b/.test(n)),
  },
  {
    key: 'magiclive',
    short: 'MAGIC Live',
    descriptor: 'Las Vegas, NV',
    cadence: 'Every August',
    hue: '#6D28D9', // violet
    match: (n) => /magic\s*live/i.test(n),
  },
  {
    key: 'blackpool',
    short: 'Blackpool',
    descriptor: "The world's biggest magic convention",
    cadence: 'Every February',
    hue: '#047857', // emerald
    match: (n) => /blackpool/i.test(n),
  },
];

function MajorCard({ major, convention }: { major: Major; convention: HomeConvention | null }) {
  const countdown = convention ? getCountdown(convention.startDate, convention.endDate) : null;
  const kicker = countdown ? countdown.text : major.cadence;
  const kickerColor = countdown?.kind === 'happening' ? ISLAND.liveGreen : major.hue;

  return (
    <Box
      component={Link}
      href={convention ? `/conventions/${convention.slug || convention.id}` : '/conventions'}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        p: 2.5,
        overflow: 'hidden',
        textDecoration: 'none',
        backgroundColor: ISLAND.bg,
        borderRadius: '12px',
        boxShadow: '0px 10px 28px -14px rgba(1, 38, 75, 0.45)',
        transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease-out',
        // The scrollwork lives on its own layer so hover can wake it up a touch.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          // Two offset layers of the same tile = the half-drop weave of a real
          // engraved card back; density comes from layering, not from opacity.
          backgroundImage: `${damaskTile(major.hue)}, ${damaskTile(major.hue)}`,
          backgroundSize: '132px 132px, 132px 132px',
          backgroundPosition: '0 0, 66px 66px',
          opacity: 0.13,
          transition: 'opacity 0.25s ease-out',
          pointerEvents: 'none',
        },
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0px 16px 34px -14px rgba(1, 38, 75, 0.55)',
        },
        '&:hover::before': { opacity: 0.22 },
        '&:focus-visible': { outline: `3px solid ${major.hue}`, outlineOffset: '2px' },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&::before': { transition: 'none' },
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Typography
        suppressHydrationWarning
        sx={{
          position: 'relative',
          fontFamily: BODY_FONT,
          fontWeight: 700,
          fontSize: '0.8rem',
          color: kickerColor,
        }}
      >
        {kicker}
      </Typography>
      <Typography
        component="h3"
        sx={{
          position: 'relative',
          fontFamily: DISPLAY_FONT,
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          color: ISLAND.ink,
          m: 0,
        }}
      >
        {major.short}
      </Typography>
      <Typography
        sx={{
          position: 'relative',
          fontFamily: BODY_FONT,
          fontSize: '0.85rem',
          lineHeight: 1.45,
          color: ISLAND.inkSecondary,
        }}
      >
        {convention
          ? `${formatLocation(convention)} · ${formatDateRange(convention.startDate, convention.endDate)}`
          : major.descriptor}
      </Typography>
    </Box>
  );
}

export default function BigFour({ conventions }: { conventions: HomeConvention[] }) {
  // List is sorted by start date, so the first match is the next edition.
  const matched = MAJORS.map(
    (m) => [m, conventions.find((c) => m.match(c.name)) ?? null] as const,
  );

  return (
    <Box
      component="section"
      aria-label="The big four conventions"
      sx={{
        // The seam: navy above, island white below — the cards sit on the line.
        backgroundImage: `linear-gradient(180deg, ${HOUSE.bg} 0%, ${HOUSE.bg} 50%, ${ISLAND.bg} 50%, ${ISLAND.bg} 100%)`,
      }}
    >
      <Box sx={{ maxWidth: 1140, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {matched.map(([major, convention]) => (
            <MajorCard key={major.key} major={major} convention={convention} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
