'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import 'flag-icons/css/flag-icons.min.css';
import { getS3ImageUrl } from '@/lib/defaults';
import {
  HomeConvention,
  HOUSE,
  ISLAND,
  DISPLAY_FONT,
  BODY_FONT,
  formatDateRange,
  formatLocation,
  getCountdown,
  countryToFlagCode,
} from './home-types';

// 4x3 flag pinned to the card's upper-right corner, flat (no border, no rounding).
function FlagCorner({ country }: { country: string | null }) {
  const code = countryToFlagCode(country);
  if (!code) return null;
  return (
    <Box
      component="span"
      className={`fi fi-${code}`}
      role="img"
      aria-label={country ?? undefined}
      title={country ?? undefined}
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 20,
        height: 15,
      }}
    />
  );
}

// Monogram initials for conventions without artwork: first letters of the two
// leading significant words ("Magi-Whirl 2026" -> "MW").
function initialsFor(name: string): string {
  const words = name
    .split(/\P{L}+/u)
    .filter((w) => w && !/^(the|of|and|a|an|at|in|on|to|for|de|la|le)$/i.test(w));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Deterministic per-convention hash so imageless cards don't render as a wall
// of identical tiles: the spotlight lands somewhere different on each stage.
function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Five stagings of the same scene (spot position + wash angle), all within the
// Blue Wash ramp. Variety without leaving the system.
const STAGE_VARIANTS = [
  { spot: '30% 108%', angle: '150deg' },
  { spot: '50% 108%', angle: '160deg' },
  { spot: '72% 108%', angle: '170deg' },
  { spot: '20% -8%', angle: '200deg' },
  { spot: '80% -8%', angle: '210deg' },
] as const;

function CardImage({
  convention,
  sx,
  monogramSize = '1.4rem',
}: {
  convention: HomeConvention;
  sx: object;
  monogramSize?: string;
}) {
  if (convention.imageUrl) {
    return (
      <Box
        component="img"
        src={getS3ImageUrl(convention.imageUrl)}
        alt=""
        loading="lazy"
        // White backing keeps transparent-PNG logos consistent card to card.
        sx={{ objectFit: 'cover', flexShrink: 0, backgroundColor: '#ffffff', ...sx }}
      />
    );
  }
  // "House Lights Down" placeholder: dark stage, a soft spotlight, and the
  // convention's monogram in cream. The spot's position varies per convention.
  const v = STAGE_VARIANTS[nameHash(convention.name) % STAGE_VARIANTS.length];
  return (
    <Box
      aria-hidden
      className="cc-stage"
      sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `radial-gradient(ellipse 90% 70% at ${v.spot}, rgba(245, 245, 220, 0.24) 0%, rgba(245, 245, 220, 0) 65%), linear-gradient(${v.angle}, #1a365d 0%, #01264b 85%)`,
        ...sx,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 800,
          fontSize: monogramSize,
          letterSpacing: '0.04em',
          color: '#f5f5dc',
        }}
      >
        {initialsFor(convention.name)}
      </Typography>
    </Box>
  );
}

/**
 * Fixed-width countdown block on the card's right edge: the number lines up
 * down the column so "how far out is it?" is scannable at a glance.
 */
function CountdownBlock({ convention }: { convention: HomeConvention }) {
  const countdown = getCountdown(convention.startDate, convention.endDate);
  const word = (text: string, color: string) => (
    <Typography
      suppressHydrationWarning
      sx={{
        fontFamily: BODY_FONT,
        fontWeight: 700,
        fontSize: '0.8rem',
        lineHeight: 1.2,
        color,
        textAlign: 'center',
      }}
    >
      {text}
    </Typography>
  );

  return (
    <Box
      sx={{
        width: 76,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {countdown.kind === 'happening' ? (
        <>
          {word('Happening', ISLAND.liveGreen)}
          {word('now!', ISLAND.liveGreen)}
        </>
      ) : countdown.kind === 'future' ? (
        <>
          {word('IN', ISLAND.inkSecondary)}
          <Typography
            suppressHydrationWarning
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 800,
              fontSize: '1.5rem',
              lineHeight: 1.15,
              color: ISLAND.countdown,
            }}
          >
            {countdown.text.replace(/\D/g, '')}
          </Typography>
          {word('DAYS', ISLAND.inkSecondary)}
        </>
      ) : (
        word(countdown.text, ISLAND.ink)
      )}
    </Box>
  );
}

/**
 * The feed card: one consistent horizontal row so image, name, dates, flag,
 * and countdown each sit in the same place on every card.
 */
export function ListCard({ convention }: { convention: HomeConvention }) {
  return (
    <Box
      component={Link}
      href={`/conventions/${convention.slug || convention.id}`}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        textDecoration: 'none',
        backgroundColor: ISLAND.bg,
        border: `1px solid ${ISLAND.border}`,
        borderRadius: '12px',
        transition:
          'background-color 0.2s ease-out, border-color 0.2s ease-out, transform 0.2s ease-out',
        '&:hover': {
          backgroundColor: ISLAND.surfaceHover,
          borderColor: ISLAND.borderHover,
          transform: 'translateY(-2px)',
        },
        '&:focus-visible': {
          outline: `3px solid ${ISLAND.navy}`,
          outlineOffset: '2px',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'background-color 0.2s, border-color 0.2s',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <FlagCorner country={convention.country} />
      <CardImage
        convention={convention}
        sx={{ width: { xs: 80, sm: 96 }, height: { xs: 80, sm: 96 }, borderRadius: '8px' }}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          component="h4"
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            lineHeight: 1.3,
            color: ISLAND.ink,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            m: 0,
            mb: 0.5,
          }}
        >
          {convention.name}
        </Typography>
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.875rem', color: ISLAND.inkSecondary }}>
          {formatLocation(convention)}
        </Typography>
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.875rem', color: ISLAND.inkSecondary }}>
          {formatDateRange(convention.startDate, convention.endDate)}
        </Typography>
      </Box>
      <CountdownBlock convention={convention} />
    </Box>
  );
}

/**
 * Hero rail card: compact horizontal, stacked inside the dark hero.
 */
export function HeroCard({ convention }: { convention: HomeConvention }) {
  const countdown = getCountdown(convention.startDate, convention.endDate);
  return (
    <Box
      component={Link}
      href={`/conventions/${convention.slug || convention.id}`}
      sx={{
        display: 'flex',
        textDecoration: 'none',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
        border: `1px solid ${HOUSE.border}`,
        borderRadius: '12px',
        transition: 'background-color 0.2s ease-out, border-color 0.2s ease-out',
        '&:hover': {
          backgroundColor: HOUSE.surfaceHover,
          borderColor: HOUSE.borderHover,
        },
        '&:focus-visible': {
          outline: `3px solid ${HOUSE.gold}`,
          outlineOffset: '2px',
        },
      }}
    >
      <CardImage convention={convention} sx={{ width: 64, height: 64, borderRadius: '8px' }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h3"
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: '0.95rem',
            lineHeight: 1.25,
            color: HOUSE.ink,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            m: 0,
          }}
        >
          {convention.name}
        </Typography>
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: '0.8rem',
            color: HOUSE.inkSecondary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {formatLocation(convention)} · {formatDateRange(convention.startDate, convention.endDate)}
        </Typography>
        <Typography
          component="span"
          suppressHydrationWarning
          sx={{
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: '0.9rem',
            color: countdown.kind === 'happening' ? HOUSE.liveGreen : HOUSE.ink,
          }}
        >
          {countdown.text}
        </Typography>
      </Box>
    </Box>
  );
}
