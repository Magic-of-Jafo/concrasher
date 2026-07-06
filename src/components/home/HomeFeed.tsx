'use client';

import React, { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import {
  HomeConvention,
  ISLAND,
  DISPLAY_FONT,
  BODY_FONT,
  monthKey,
  monthLabel,
} from './home-types';
import { ListCard, FeaturedCard } from './HomeConventionCard';

const HORIZON_DAYS = 120;

export default function HomeFeed({ conventions }: { conventions: HomeConvention[] }) {
  const [showLater, setShowLater] = useState(false);

  // Split at the horizon; group each side by month.
  const { nearGroups, laterGroups } = useMemo(() => {
    const horizon = Date.now() + HORIZON_DAYS * 86400000;
    const near: HomeConvention[] = [];
    const later: HomeConvention[] = [];
    for (const c of conventions) {
      if (!c.startDate) continue;
      (new Date(c.startDate).getTime() <= horizon ? near : later).push(c);
    }
    const group = (list: HomeConvention[]) => {
      const map = new Map<string, HomeConvention[]>();
      for (const c of list) {
        const key = monthKey(c.startDate!);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      }
      return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    };
    return { nearGroups: group(near), laterGroups: group(later) };
  }, [conventions]);

  // The feed's very first convention gets the marquee treatment; everything
  // after it stays a scannable phonebook row.
  const renderGroups = (groups: [string, HomeConvention[]][], featureFirst = false) =>
    groups.map(([key, items], groupIdx) => (
      <Box key={key} component="section" sx={{ mb: 5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1.5,
            pb: 0.75,
            borderBottom: `1px solid ${ISLAND.border}`,
          }}
        >
          <Typography
            component="h3"
            sx={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 800,
              fontSize: '1.35rem',
              letterSpacing: '-0.01em',
              color: ISLAND.ink,
              m: 0,
            }}
          >
            {monthLabel(key)}
          </Typography>
          <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.85rem', color: ISLAND.inkSecondary }}>
            {items.length} {items.length === 1 ? 'convention' : 'conventions'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {items.map((c, i) =>
            featureFirst && groupIdx === 0 && i === 0 ? (
              <FeaturedCard key={c.id} convention={c} />
            ) : (
              <ListCard key={c.id} convention={c} />
            ),
          )}
        </Box>
      </Box>
    ));

  return (
    <Box component="section" id="upcoming" sx={{ scrollMarginTop: 24 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          mb: 3,
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 2vw + 0.75rem, 2rem)',
            color: ISLAND.ink,
            m: 0,
          }}
        >
          Coming up
        </Typography>
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.9rem', color: ISLAND.inkSecondary }}>
          Want more filters?{' '}
          <Box
            component={Link}
            href="/conventions"
            sx={{
              color: ISLAND.ink,
              textDecoration: 'underline',
              '&:hover': { color: ISLAND.countdown },
              '&:focus-visible': { outline: `3px solid ${ISLAND.navy}`, outlineOffset: '2px' },
            }}
          >
            Browse all conventions
          </Box>
        </Typography>
      </Box>

      {nearGroups.length === 0 && laterGroups.length === 0 ? (
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: '0.95rem', color: ISLAND.inkSecondary }}>
          That&apos;s everything listed right now. New events are added all the time.
        </Typography>
      ) : (
        <>
          {renderGroups(nearGroups, true)}
          {laterGroups.length > 0 &&
            (showLater ? (
              renderGroups(laterGroups)
            ) : (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Button
                  onClick={() => setShowLater(true)}
                  sx={{
                    minHeight: 44,
                    px: 4,
                    borderRadius: '4px',
                    textTransform: 'none',
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: ISLAND.navy,
                    border: `1px solid ${ISLAND.navy}`,
                    '&:hover': { backgroundColor: ISLAND.surfaceHover },
                    '&:focus-visible': { outline: `3px solid ${ISLAND.navy}`, outlineOffset: '2px' },
                  }}
                >
                  Show later events
                </Button>
              </Box>
            ))}
        </>
      )}
    </Box>
  );
}
