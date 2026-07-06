'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { HomeConvention, HOUSE, DISPLAY_FONT, BODY_FONT } from './home-types';
import { HeroMessage } from './headlines';
import { HeroCard } from './HomeConventionCard';

// The hero is a crafted stage scene: house lights down, one warm spot about to
// hit the stage. All light is built from cream at low alpha (gold stays
// reserved for the CTA, per the Gold Spot Rule). A Vimeo background video will
// later slot into the scene layer *under* the light overlays — the scene
// doubles as its loading/blocked fallback, so the hero never goes flat again.

const riseSx = (delayMs: number) =>
  ({
    animation: 'home-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
    animationDelay: `${delayMs}ms`,
  }) as const;

export default function HomeHero({
  nextThree,
  message,
}: {
  nextThree: HomeConvention[];
  message: HeroMessage;
}) {
  return (
    <Box component="section" sx={{ position: 'relative', overflow: 'hidden', backgroundColor: HOUSE.bg }}>
      {/* The stage light. Three layers: a wide diagonal wash, the beam itself
          crossing behind the headline, and a warm pool rising from the stage
          floor. It blooms in on load. */}
      <Box
        aria-hidden
        className="home-bloom"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          animation: 'home-bloom 1.6s ease-out both',
          backgroundImage: [
            // beam core: a soft-edged shaft from the upper left
            'linear-gradient(112deg, transparent 18%, rgba(245, 245, 220, 0.055) 26%, rgba(245, 245, 220, 0.11) 33%, rgba(245, 245, 220, 0.055) 40%, transparent 48%)',
            // wide ambient wash the beam sits inside
            'linear-gradient(112deg, rgba(245, 245, 220, 0.05) 0%, transparent 55%)',
            // warm pool where the beam lands on the stage floor
            'radial-gradient(ellipse 70% 45% at 38% 108%, rgba(245, 245, 220, 0.14) 0%, rgba(245, 245, 220, 0) 65%)',
            // deep-house vignette on the far side (absence of light = black alpha)
            'radial-gradient(ellipse 90% 80% at 100% 0%, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 60%)',
          ].join(', '),
        }}
      />

      {/* Hero content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1140,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 6, md: 11 },
          pb: { xs: 5, md: 10 },
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 4, lg: 8 },
          alignItems: { lg: 'center' },
        }}
      >
        {/* Left: the pitch */}
        <Box sx={{ flex: { lg: '1 1 55%' } }}>
          <Typography
            component="h1"
            className="home-rise"
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 800,
              fontSize: 'clamp(2.25rem, 3.5vw + 1rem, 4rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: HOUSE.cream,
              textWrap: 'balance',
              m: 0,
              mb: 2.5,
              ...riseSx(0),
            }}
          >
            {message.headline}
          </Typography>
          <Typography
            className="home-rise"
            sx={{
              fontFamily: BODY_FONT,
              fontSize: { xs: '1rem', md: '1.15rem' },
              lineHeight: 1.65,
              color: HOUSE.inkSecondary,
              maxWidth: '52ch',
              mb: 3.5,
              ...riseSx(90),
            }}
          >
            {message.sub}
          </Typography>
          <Button
            href="#upcoming"
            className="home-rise"
            sx={{
              backgroundColor: HOUSE.gold,
              color: HOUSE.navyOnGold,
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'none',
              px: 5,
              py: 1.5,
              minHeight: 48,
              borderRadius: '9999px',
              transition: 'background-color 0.2s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
              '&:hover': { backgroundColor: HOUSE.goldWarm, transform: 'translateY(-2px)' },
              '&:focus-visible': { outline: `3px solid ${HOUSE.cream}`, outlineOffset: '3px' },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'background-color 0.2s',
                '&:hover': { transform: 'none' },
              },
              ...riseSx(180),
            }}
          >
            See what&apos;s coming up
          </Button>
        </Box>

        {/* Right: immediate utility — the next three conventions */}
        <Box
          className="home-rise"
          sx={{ flex: { lg: '1 1 45%' }, minWidth: 0, ...riseSx(140) }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: HOUSE.inkFaint,
              m: 0,
              mb: 1.5,
            }}
          >
            Up next
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {nextThree.map((c) => (
              <HeroCard key={c.id} convention={c} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
