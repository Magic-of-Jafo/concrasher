'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import Link from 'next/link';
import { HomeConvention } from '../home/home-types';
import type { HeroMessage } from '../home/headlines';
import FrontHero from './FrontHero';
import FrontMajors, { MajorData } from './FrontMajors';
import FrontBilling, { pickFeatured } from './FrontBilling';
import Front100Days from './Front100Days';

// The Electric Night front page ("the Anchor layout"): masthead with the claim,
// majors strip, Top Billing + up-next rail, first-timer pitch band, and the
// next 100 days by month. Two themes (House Lights down/up) driven by the
// --cc-* variables in globals.css; the toggle lives in the topline.
// Design contract: scratchpad mock anchor-night.html (2026-07-07).

export const DISPLAY = 'var(--font-montserrat), system-ui, arial, sans-serif';
export const BODY = 'var(--font-open-sans), system-ui, arial, sans-serif';

/** The one CTA shape: a rectangle, never a pill (see DESIGN.md / papyrus rule). */
export function GoldButton({ href, children, newTab = false }: { href: string; children: React.ReactNode; newTab?: boolean }) {
    return (
        <Button
            component={Link}
            href={href}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
            sx={{
                backgroundColor: '#F5A623',
                color: '#1C1405',
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: '0.9rem',
                textTransform: 'none',
                px: 3.25,
                py: 1.5,
                minHeight: 48,
                borderRadius: '8px',
                boxShadow: 'var(--cc-glow-gold)',
                transition: 'filter 0.2s ease-out',
                '&:hover': { backgroundColor: '#FFB43B', filter: 'brightness(1.03)' },
                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '3px' },
            }}
        >
            {children}
        </Button>
    );
}

function HouseLightsToggle() {
    const [light, setLight] = useState(false);
    // The no-flash script in layout.tsx set data-theme before hydration; adopt it.
    useEffect(() => {
        setLight(document.documentElement.dataset.theme === 'light');
    }, []);
    const toggle = useCallback(() => {
        const next = !light;
        setLight(next);
        document.documentElement.dataset.theme = next ? 'light' : '';
        try { localStorage.setItem('cc-house-lights', next ? 'light' : 'dark'); } catch { /* private mode */ }
    }, [light]);
    // A wordless slide toggle showing the CURRENT state: the thumb sits on
    // the sun in light mode and on the moon in dark mode. (The old labeled
    // button described the action instead, which read backwards.)
    return (
        <Box
            component="button"
            type="button"
            role="switch"
            onClick={toggle}
            aria-checked={light}
            aria-label="Light or dark theme"
            suppressHydrationWarning
            sx={{
                position: 'relative',
                width: 64,
                height: 32,
                p: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease-out',
                '&:hover': { borderColor: 'var(--cc-cyan)' },
                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
            }}
        >
            {/* The thumb glides to the active side. */}
            <Box
                aria-hidden
                suppressHydrationWarning
                sx={{
                    position: 'absolute',
                    top: 3,
                    left: light ? 3 : 33,
                    width: 26,
                    height: 24,
                    borderRadius: '8px',
                    backgroundColor: 'var(--cc-gold)',
                    transition: 'left 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
            />
            <LightModeIcon
                suppressHydrationWarning
                sx={{ fontSize: 15, ml: '8.5px', zIndex: 1, color: light ? 'var(--cc-gold-ink)' : 'var(--cc-soft)', transition: 'color 0.2s' }}
            />
            <DarkModeIcon
                suppressHydrationWarning
                sx={{ fontSize: 14, mr: '9px', zIndex: 1, color: light ? 'var(--cc-soft)' : 'var(--cc-gold-ink)', transition: 'color 0.2s' }}
            />
        </Box>
    );
}

function TopLine() {
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    return (
        <Box
            sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 1.5, flexWrap: 'wrap', pb: 1.5,
            }}
        >
            <Typography
                suppressHydrationWarning
                sx={{
                    fontFamily: BODY, fontSize: '0.72rem', fontWeight: 700,
                    letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cc-soft)',
                }}
            >
                {today}
            </Typography>
            <HouseLightsToggle />
        </Box>
    );
}

function Masthead() {
    return (
        <Box component="header" sx={{ textAlign: 'center', pt: 1, pb: 2.5 }}>
            <Box
                component="img"
                src="https://convention-crasher.s3.us-east-1.amazonaws.com/images/defaults/convention-crasher-logo.png"
                alt="Convention Crasher"
                sx={{ width: 'min(270px, 55vw)', filter: 'var(--cc-glow-logo)', display: 'block', mx: 'auto' }}
            />
            <Typography
                component="p"
                sx={{
                    fontFamily: DISPLAY,
                    fontSize: 'clamp(0.95rem, 2vw, 1.25rem)',
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--cc-ink)',
                    mt: 2,
                }}
            >
                Every magic convention on Earth
            </Typography>
            <Typography
                component={Link}
                href="/contact"
                sx={{
                    display: 'inline-block',
                    mt: 1,
                    fontFamily: DISPLAY,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--cc-cyan)',
                    textShadow: 'var(--cc-glow-cyan)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--cc-panel-border)',
                    pb: '2px',
                    '&:hover': { borderColor: 'var(--cc-cyan)' },
                    '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '3px' },
                }}
            >
                Are we missing one? Submit it here
            </Typography>
        </Box>
    );
}

function PitchBand() {
    return (
        <Box
            sx={{
                mt: 4,
                borderRadius: '12px',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                px: 3,
                py: 2.5,
            }}
        >
            <Box>
                <Typography sx={{ fontFamily: DISPLAY, fontSize: '1.15rem', fontWeight: 800, color: 'var(--cc-ink)' }}>
                    Never been to one?{' '}
                    <Box component="em" sx={{ fontStyle: 'normal', color: 'var(--cc-cyan)', textShadow: 'var(--cc-glow-cyan)' }}>
                        You&apos;re exactly who they&apos;re for.
                    </Box>
                </Typography>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', mt: 0.5 }}>
                    Hobbyists, fans, and first-timers. Nobody checks your double lift at the door.
                </Typography>
            </Box>
            <GoldButton href="/conventions">See what&apos;s coming up</GoldButton>
        </Box>
    );
}

function FrontFooter() {
    const linkSx = {
        fontFamily: BODY, fontSize: '0.78rem', color: 'var(--cc-soft)', textDecoration: 'none',
        minHeight: 44, display: 'inline-flex', alignItems: 'center',
        '&:hover': { color: 'var(--cc-ink)', textDecoration: 'underline' },
        '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
    } as const;
    return (
        <Box
            component="footer"
            sx={{
                mt: 4, borderTop: '1px solid var(--cc-hairline)', pt: 1,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
            }}
        >
            <Typography sx={{ fontFamily: BODY, fontSize: '0.78rem', color: 'var(--cc-soft)' }}>
                © {new Date().getFullYear()} ConventionCrasher · magic conventions from around the world, all in one place
            </Typography>
            <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                <Box component={Link} href="/conventions" sx={linkSx}>Browse all</Box>
                <Box component={Link} href="/register" sx={linkSx}>Create a free account</Box>
                <Box component={Link} href="/login" sx={linkSx}>Sign in</Box>
            </Box>
        </Box>
    );
}

export default function FrontPage({
    conventions,
    loadFailed,
    heroMessage,
    heroImage,
    majors,
    featuredId = null,
}: {
    conventions: HomeConvention[];
    loadFailed: boolean;
    heroMessage: HeroMessage;
    heroImage: string | null;
    majors: MajorData[];
    /** Admin's Featured pick (from /admin/conventions); null = automatic. */
    featuredId?: string | null;
}) {
    // The rail trio is the only thing pulled out of the 100-days list, so the
    // listings stay identical no matter which convention is featured. The
    // featured pick rotates, so it is intentionally NOT excluded — it may also
    // appear in its normal chronological spot (accepted redundancy).
    const rail = conventions.slice(0, 3);
    const billing = pickFeatured(conventions, featuredId);
    const excludeIds = rail.map((c) => c.id);

    return (
        <Box
            component="main"
            id="main-content"
            sx={{
                backgroundColor: 'var(--cc-bg)',
                minHeight: '100vh',
                position: 'relative',
                isolation: 'isolate',
                // The wallpaper: Victorian damask tinted through the theme's
                // blend tokens, fixed so content scrolls over it. Decorative
                // only; sits under every other layer.
                '&::before': {
                    content: '""',
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    pointerEvents: 'none',
                    backgroundImage: 'var(--cc-pattern-overlay), url(/BG/bg_pattern.png)',
                    backgroundSize: 'auto, var(--cc-pattern-size) var(--cc-pattern-size)',
                    backgroundBlendMode: 'var(--cc-pattern-blend)',
                    opacity: 'var(--cc-pattern-opacity)',
                },
            }}
        >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* The sheet: a solid panel behind the content column, so the
                    wallpaper reads in the gutters only, never under the text. */}
                <Box
                    sx={{
                        maxWidth: 1080,
                        mx: 'auto',
                        px: { xs: 2.5, md: 6 },
                        pt: 3,
                        pb: 5,
                        minHeight: '100vh',
                        backgroundColor: 'var(--cc-bg)',
                        backgroundImage: 'var(--cc-field)',
                        boxShadow: '0 0 44px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <TopLine />
                    <Masthead />
                    <FrontHero message={heroMessage} imageUrl={heroImage} />
                    <FrontMajors majors={majors} />

                    {loadFailed ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography sx={{ fontFamily: BODY, fontSize: '1rem', color: 'var(--cc-ink)', mb: 1 }}>
                                We couldn&apos;t load the convention list just now.
                            </Typography>
                            <Typography sx={{ fontFamily: BODY, fontSize: '0.9rem', color: 'var(--cc-muted)' }}>
                                It&apos;s on our end. Give it a minute, then{' '}
                                <Box component="a" href="/" sx={{ color: 'var(--cc-cyan)', textDecoration: 'underline' }}>
                                    refresh the page
                                </Box>.
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <FrontBilling billing={billing} rail={rail} />
                            <PitchBand />
                            <Front100Days conventions={conventions} excludeIds={excludeIds} />
                        </>
                    )}

                    {/* Below the fold: reserved. The event ticker and "From the blog"
                        land here (see memory: ticker-tape-events, blog-subdomain-plan). */}
                    <FrontFooter />
                </Box>
            </Box>
        </Box>
    );
}
