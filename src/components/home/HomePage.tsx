'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import FacebookIcon from '@mui/icons-material/Facebook';
import { HomeConvention, HOUSE, ISLAND, DISPLAY_FONT, BODY_FONT } from './home-types';
import { HeroMessage } from './headlines';
import HomeHero from './HomeHero';
import HomeFeed from './HomeFeed';
import BigFour from './BigFour';

const containerSx = {
  maxWidth: 1140,
  mx: 'auto',
  px: { xs: 2, sm: 3, md: 4 },
} as const;

function FirstTimerBridge() {
  return (
    <Box>
      <Typography
        component="h2"
        sx={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: '1.5rem',
          color: HOUSE.cream,
          textWrap: 'balance',
          m: 0,
          mb: 2,
        }}
      >
        Never been to one? You&apos;re exactly who they&apos;re for.
      </Typography>
      <Typography
        sx={{
          fontFamily: BODY_FONT,
          fontSize: '1rem',
          lineHeight: 1.7,
          color: HOUSE.inkSecondary,
          mb: 2,
        }}
      >
        Magic conventions aren&apos;t just for pros. They&apos;re where hobbyists, fans, and
        first-timers see live shows, sit in on lectures, and stay up too late trading moves with
        new friends. Nobody checks your credentials at the door.
      </Typography>
      <Box
        component="details"
        sx={{
          '& summary': {
            cursor: 'pointer',
            fontFamily: BODY_FONT,
            fontWeight: 600,
            fontSize: '0.95rem',
            color: HOUSE.ink,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            listStyle: 'none',
            '&::before': {
              content: '"▸"',
              display: 'inline-block',
              mr: 1,
              transition: 'transform 0.2s ease-out',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            },
            '&:focus-visible': { outline: `3px solid ${HOUSE.gold}`, outlineOffset: '2px' },
          },
          '&[open] summary::before': { transform: 'rotate(90deg)' },
        }}
      >
        <Box component="summary">What&apos;s a convention weekend actually like?</Box>
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: '0.95rem',
            lineHeight: 1.7,
            color: HOUSE.inkSecondary,
            pt: 1,
          }}
        >
          Usually two to four days at a hotel or theater: gala shows in the evening, lectures and
          workshops during the day, a dealers&apos; room full of things you didn&apos;t know
          existed, and session jams in the lobby that run past midnight. Most events sell day
          passes if you&apos;d rather just dip a toe in.
        </Typography>
      </Box>
    </Box>
  );
}

// Sidebar module: the Facebook follow CTA, moved out of the feed (it used to
// interrupt the listing column) into the first "ad slot" under the bridge.
function FacebookCard() {
  return (
    <Box
      component="a"
      href="https://www.facebook.com/conventioncrasher"
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        mt: 3,
        pt: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textDecoration: 'none',
        borderTop: `1px solid ${HOUSE.border}`,
        borderRadius: '4px',
        transition: 'background-color 0.2s ease-out',
        '&:hover': {
          backgroundColor: HOUSE.surface,
        },
        '&:focus-visible': {
          outline: `3px solid ${HOUSE.gold}`,
          outlineOffset: '2px',
        },
      }}
    >
      <FacebookIcon sx={{ fontSize: 36, color: '#4599ff', flexShrink: 0 }} />
      <Box>
        <Typography
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: '0.95rem',
            color: HOUSE.ink,
            lineHeight: 1.3,
            mb: 0.25,
          }}
        >
          Follow us on Facebook
        </Typography>
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: '0.85rem',
            lineHeight: 1.45,
            color: HOUSE.inkSecondary,
          }}
        >
          New listings and feature updates land there first.
        </Typography>
      </Box>
    </Box>
  );
}

function ClosingBeat() {
  return (
    <Box component="section" sx={{ py: { xs: 6, md: 8 } }}>
      <Box sx={{ ...containerSx, textAlign: 'center' }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 'clamp(1.4rem, 2vw + 0.6rem, 1.9rem)',
            color: HOUSE.ink,
            textWrap: 'balance',
            m: 0,
            mb: 1.5,
          }}
        >
          Don&apos;t want to keep checking back?
        </Typography>
        <Typography
          sx={{
            fontFamily: BODY_FONT,
            fontSize: '1rem',
            lineHeight: 1.6,
            color: HOUSE.inkSecondary,
            maxWidth: '52ch',
            mx: 'auto',
            mb: 3,
          }}
        >
          Create a free account and get a heads-up when a convention lands near you.
        </Typography>
        <Button
          component={Link}
          href="/register"
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
          }}
        >
          Sign up free
        </Button>
      </Box>
    </Box>
  );
}

function SiteFooter() {
  const linkSx = {
    fontFamily: BODY_FONT,
    fontSize: '0.9rem',
    color: HOUSE.inkSecondary,
    textDecoration: 'none',
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    '&:hover': { color: HOUSE.ink, textDecoration: 'underline' },
    '&:focus-visible': { outline: `3px solid ${HOUSE.gold}`, outlineOffset: '2px' },
  } as const;

  return (
    <Box component="footer" sx={{ borderTop: `1px solid ${HOUSE.border}`, py: 4 }}>
      <Box
        sx={{
          ...containerSx,
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 2, md: 6 },
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ maxWidth: '40ch' }}>
          <Typography
            sx={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: '1rem', color: HOUSE.ink, mb: 0.5 }}
          >
            ConventionCrasher
          </Typography>
          <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.85rem', color: HOUSE.inkSecondary }}>
            Magic conventions from around the world, all in one place.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box component={Link} href="/conventions" sx={linkSx}>
            Browse all conventions
          </Box>
          <Box component={Link} href="/register" sx={linkSx}>
            Create a free account
          </Box>
          <Box component={Link} href="/login" sx={linkSx}>
            Sign in
          </Box>
          <Box
            component="a"
            href="https://www.facebook.com/conventioncrasher"
            target="_blank"
            rel="noopener noreferrer"
            sx={linkSx}
          >
            Follow us on Facebook
          </Box>
        </Box>
      </Box>
      <Typography
        sx={{
          ...containerSx,
          pt: 3,
          fontFamily: BODY_FONT,
          fontSize: '0.8rem',
          color: HOUSE.inkSecondary,
        }}
      >
        © {new Date().getFullYear()} ConventionCrasher
      </Typography>
    </Box>
  );
}

export default function HomePage({
  conventions,
  loadFailed,
  heroMessage,
}: {
  conventions: HomeConvention[];
  loadFailed: boolean;
  heroMessage: HeroMessage;
}) {
  const nextThree = conventions.slice(0, 3);
  // The hero already shows the first three; the feed picks up from there.
  const feedConventions = conventions.slice(3);

  return (
    <Box component="main" id="main-content" sx={{ backgroundColor: HOUSE.bg, minHeight: '100vh' }}>
      <HomeHero nextThree={nextThree} message={heroMessage} />

      {/* The Big Four band: the seam between the auditorium and the island */}
      <BigFour conventions={conventions} />

      {/* Light island: sidebar (first-timer bridge, future content) + the feed */}
      <Box sx={{ backgroundColor: ISLAND.bg }}>
        <Box
          sx={{
            ...containerSx,
            pt: { xs: 5, md: 7 },
            pb: { xs: 6, md: 8 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 5, md: 6 },
            alignItems: 'flex-start',
          }}
        >
          <Box
            component="aside"
            sx={{
              width: { xs: '100%', md: 360 },
              flexShrink: 0,
              position: { md: 'sticky' },
              top: { md: 24 },
              // The rail is a piece of the auditorium sitting beside the
              // white feed: dark Blue Wash panel, light type.
              backgroundColor: HOUSE.bg,
              borderRadius: '12px',
              p: 3,
            }}
          >
            <FirstTimerBridge />
            <FacebookCard />
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {loadFailed ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography sx={{ fontFamily: BODY_FONT, fontSize: '1.05rem', color: ISLAND.ink, mb: 1 }}>
                  We couldn&apos;t load the convention list just now.
                </Typography>
                <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.95rem', color: ISLAND.inkSecondary }}>
                  It&apos;s on our end. Give it a minute, then{' '}
                  <Box component="a" href="/" sx={{ color: ISLAND.ink, textDecoration: 'underline' }}>
                    refresh the page
                  </Box>
                  .
                </Typography>
              </Box>
            ) : conventions.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography sx={{ fontFamily: BODY_FONT, fontSize: '1.05rem', color: ISLAND.ink, mb: 1 }}>
                  No upcoming conventions listed right now.
                </Typography>
                <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.95rem', color: ISLAND.inkSecondary }}>
                  New events are added all the time.{' '}
                  <Box component={Link} href="/register" sx={{ color: ISLAND.ink, textDecoration: 'underline' }}>
                    Create a free account
                  </Box>{' '}
                  and hear about them first.
                </Typography>
              </Box>
            ) : (
              <HomeFeed conventions={feedConventions} />
            )}
          </Box>
        </Box>
      </Box>

      {/* Ticker tape of organizer-curated upcoming events lands here later
          (soon events surface more often); see memory/ticker-tape-events. */}
      <ClosingBeat />
      <SiteFooter />
    </Box>
  );
}
