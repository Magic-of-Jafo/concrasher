"use client";

import { Box, Typography } from "@mui/material";
import Link from "next/link";
import { Convention } from "@prisma/client";
import { formatLocationForGrid } from '@/lib/location-utils';
import { formatDateRange, getCountdown } from '@/components/home/home-types';
import { DISPLAY, BODY } from '@/components/frontpage/FrontPage';
import FrontThumb, { FlagCorner } from '@/components/frontpage/FrontThumb';

// Browse results in the front page rail's card language: thumb, countdown
// kicker, name, "location · dates" sub-line, corner flag. One recipe across
// the site so a convention row always reads as the same object.

interface ConventionGridProps {
  conventions: (Convention & { distanceKm?: number | null })[];
  loading?: boolean;
  /** Past view: the kicker becomes the edition's year instead of a countdown. */
  showingPast?: boolean;
  /** Set only when the nearest sort applied: cards then show "≈ N mi from home". */
  distanceUnit?: 'mi' | 'km';
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

/** API rows arrive JSON-serialized; normalize date-ish values to ISO strings
 *  for the shared formatters. */
const toIso = (d: Date | string | null | undefined): string | null =>
  d ? new Date(d).toISOString() : null;

/** Rounded display distance — proximity a reader can feel beats precision. */
function displayDistance(km: number, unit: 'mi' | 'km'): string {
  const value = unit === 'mi' ? km * 0.621371 : km;
  const rounded = value < 10 ? Math.max(1, Math.round(value)) : Math.round(value / 5) * 5;
  return rounded.toLocaleString();
}

export default function ConventionGrid({
  conventions = [],
  loading = false,
  showingPast = false,
  distanceUnit,
}: ConventionGridProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }} role="status" aria-label="Loading conventions">
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              height: 88,
              borderRadius: '8px',
              backgroundColor: 'var(--cc-panel)',
              border: '1px solid var(--cc-hairline)',
              opacity: 0.55,
            }}
          />
        ))}
      </Box>
    );
  }

  if (!conventions || conventions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
          No conventions found
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="ul" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, listStyle: 'none', m: 0, p: 0 }}>
      {conventions.map((convention) => {
        const startIso = toIso(convention.startDate);
        const endIso = toIso(convention.endDate);
        const cd = getCountdown(startIso, endIso);
        // The shared countdown has no "already over" branch (the front page
        // never shows past events); in the Past view the year IS the story.
        const kicker = showingPast
          ? (startIso ? String(new Date(startIso).getUTCFullYear()) : 'Past event')
          : (cd.kind === 'happening' ? '● Happening now' : cd.text);
        // Muted (not soft): the year kicker is small bold text and soft gray
        // sits under AA contrast on the dark panel.
        const kickerColor = showingPast
          ? 'var(--cc-muted)'
          : cd.kind === 'happening' ? 'var(--cc-live)' : 'var(--cc-magenta)';
        const location = formatLocationForGrid(convention);
        const dates = formatDateRange(startIso, endIso);

        return (
          <Box component="li" key={convention.id} sx={{ m: 0, p: 0 }}>
            <Box
              component={Link}
              href={`/conventions/${convention.slug}`}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                borderRadius: '8px',
                p: 1.5,
                transition: 'border-color 0.18s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                '@media (hover: hover)': {
                  '&:hover': { borderColor: 'var(--cc-cyan)', transform: 'translateY(-2px)' },
                },
                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'border-color 0.18s',
                  '@media (hover: hover)': { '&:hover': { transform: 'none' } },
                },
              }}
            >
              <FrontThumb
                convention={{
                  name: convention.name,
                  imageUrl: convention.profileImageUrl ?? convention.coverImageUrl ?? null,
                } as any}
                size={56}
              />
              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25, pr: 4 }}>
                <Typography
                  suppressHydrationWarning
                  sx={{
                    fontFamily: DISPLAY, fontSize: '0.68rem', fontWeight: 800,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: kickerColor,
                    textShadow: !showingPast && cd.kind === 'happening' ? 'var(--cc-glow-live)' : 'none',
                  }}
                >
                  {kicker}
                </Typography>
                <Typography component="h3" sx={{ fontFamily: DISPLAY, fontSize: '1.02rem', fontWeight: 800, lineHeight: 1.25, color: 'var(--cc-ink)', m: 0 }}>
                  {convention.name}
                </Typography>
                <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.8rem', color: 'var(--cc-muted)' }}>
                  {location} · {dates}
                </Typography>
              </Box>

              {/* Nearest mode: distance is the headline number the eye should
                  catch scanning the list ("that one's only 40 mi!"). Right-
                  aligned, cyan signal color, clear of the corner flag. */}
              {distanceUnit && convention.distanceKm != null && (
                <Box
                  sx={{
                    ml: 'auto',
                    flexShrink: 0,
                    pr: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    lineHeight: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: DISPLAY, fontWeight: 800,
                        fontSize: 'clamp(1.4rem, 5vw, 1.75rem)', lineHeight: 1,
                        color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)',
                      }}
                    >
                      {displayDistance(convention.distanceKm, distanceUnit)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '0.82rem', color: 'var(--cc-cyan)' }}
                    >
                      {distanceUnit}
                    </Typography>
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: BODY, fontSize: '0.62rem', fontWeight: 600,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--cc-muted)', mt: 0.4, whiteSpace: 'nowrap',
                    }}
                  >
                    from home
                  </Typography>
                </Box>
              )}

              {/* Corner flag only when distance isn't claiming the right edge. */}
              {!(distanceUnit && convention.distanceKm != null) && <FlagCorner country={convention.country} />}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
