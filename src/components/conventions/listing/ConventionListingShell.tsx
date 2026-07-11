'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import EditIcon from '@mui/icons-material/Edit';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { getS3ImageUrl } from '@/lib/defaults';
import { formatDateRange } from '@/components/home/home-types';
import ScheduleSection from '@/components/conventions/detail/ScheduleSection';
import FestivalSchedule from '@/components/conventions/detail/FestivalSchedule';
import PricingSection from '@/components/conventions/detail/PricingSection';
import VenueSection from '@/components/conventions/detail/VenueSection';
import HotelSection from '@/components/conventions/detail/HotelSection';
import DealersSection from '@/components/conventions/detail/DealersSection';
import MediaGallerySection from '@/components/conventions/detail/MediaGallerySection';
import { LISTING_TABS, ListingTab, ListingTabKey, tabKeyForPath } from './listing-tabs';

// The public convention listing, "True Tabs" structure (prototype B,
// 2026-07-10): clean cover band, avatar breaking its bottom edge, kicker /
// title / meta below in normal flow, then a sticky tab bar where every tab
// owns the full screen and its own URL. The registration CTA persists:
// bottom bar on mobile, in the banner on desktop. Off-site links always
// open in a new tab. Themed with the House Lights --cc-* tokens.

declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
        gtag?: (...args: any[]) => void;
    }
}

const DISPLAY = 'var(--font-montserrat), system-ui, arial, sans-serif';
const BODY = 'var(--font-open-sans), system-ui, arial, sans-serif';

interface ShellProps {
    convention: any;
    canEdit?: boolean;
    initialTab: ListingTabKey;
}

function toIso(value: unknown): string | null {
    return value ? new Date(value as string).toISOString() : null;
}

/** Banner kicker: live day counter, countdown, TBD, or the wrap date. */
function kickerFor(convention: any): { text: string; live: boolean; past: boolean } {
    const startIso = toIso(convention.startDate);
    const endIso = toIso(convention.endDate) ?? startIso;
    if (convention.isTBD || !startIso) return { text: 'Dates TBD', live: false, past: false };
    const day = (iso: string) => {
        const d = new Date(iso);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    };
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const start = day(startIso);
    const end = day(endIso!);
    if (today >= start && today <= end) {
        const dayNo = Math.floor((today - start) / 86400000) + 1;
        const total = Math.floor((end - start) / 86400000) + 1;
        return { text: `● Happening now · Day ${dayNo} of ${total}`, live: true, past: false };
    }
    if (today < start) {
        const days = Math.round((start - today) / 86400000);
        return { text: days === 1 ? 'Starts tomorrow' : `In ${days} days`, live: false, past: false };
    }
    return { text: `Wrapped ${formatDateRange(endIso, null)}`, live: false, past: true };
}

function locationLine(convention: any): string {
    const isUS = /united states|usa/i.test(convention.country || '');
    const parts = isUS
        ? [convention.city, convention.stateAbbreviation || convention.stateName]
        : [convention.city, convention.country];
    return parts.filter(Boolean).join(', ') || 'Location TBD';
}

/** The one CTA shape: a gold rectangle, never a pill (papyrus rule). */
function RegisterButton({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
    return (
        <Button
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            fullWidth={!compact}
            sx={{
                backgroundColor: 'var(--cc-gold)',
                color: 'var(--cc-gold-ink)',
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: compact ? '0.85rem' : '0.95rem',
                textTransform: 'none',
                px: compact ? 2.75 : 3.25,
                py: compact ? 1.25 : 1.5,
                minHeight: compact ? 44 : 48,
                borderRadius: '8px',
                boxShadow: 'var(--cc-glow-gold)',
                whiteSpace: 'nowrap',
                transition: 'filter 0.2s ease-out',
                '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.06)' },
                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '3px' },
            }}
        >
            {label}&nbsp;↗
        </Button>
    );
}

// The engagement box: star / favorite / alerts, previewed here as grayed-out
// actions (the features land in an upcoming pass — schema and endpoints don't
// exist yet). For visitors it doubles as an account pitch; the actions will
// unlock for signed-in users when they're wired up.
function EngagementPanel() {
    const { status } = useSession();
    const loggedIn = status === 'authenticated';
    const rows = [
        { Icon: StarBorderIcon, label: 'Give it a star' },
        { Icon: FavoriteBorderIcon, label: 'Add to favorites' },
        { Icon: NotificationsNoneIcon, label: 'Get alerts' },
    ];
    return (
        <Box
            sx={{
                borderRadius: '12px',
                backgroundColor: 'var(--cc-panel)',
                border: '1px solid var(--cc-panel-border)',
                p: 2.5,
            }}
        >
            <Typography component="h3" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1rem', color: 'var(--cc-ink)', m: 0 }}>
                Keep tabs on this one
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.75 }}>
                {rows.map(({ Icon, label }) => (
                    <Box
                        key={label}
                        aria-disabled
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1.25,
                            fontFamily: DISPLAY, fontWeight: 700, fontSize: '0.85rem',
                            color: 'var(--cc-soft)',
                            border: '1px solid var(--cc-hairline)',
                            borderRadius: '8px',
                            px: 1.75, py: 1.25, minHeight: 44,
                            opacity: 0.75,
                            cursor: 'default',
                        }}
                    >
                        <Icon sx={{ fontSize: 18 }} />
                        {label}
                    </Box>
                ))}
            </Box>
            <Typography sx={{ fontFamily: BODY, fontSize: '0.78rem', color: 'var(--cc-muted)', mt: 1.5 }}>
                {loggedIn ? (
                    <>Almost ready. These unlock in an upcoming update.</>
                ) : (
                    <>
                        <Box
                            component={Link}
                            href="/login"
                            sx={{ color: 'var(--cc-cyan)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                            Log in or sign up
                        </Box>
                        {' '}to star, favorite, and get alerts.
                    </>
                )}
            </Typography>
        </Box>
    );
}

function AboutPane({ convention }: { convention: any }) {
    const html = convention.descriptionMain || convention.descriptionShort;
    // The helpers write plain text with blank-line paragraph breaks; the rich
    // editor writes HTML. Render whichever this listing carries.
    const isHtml = !!html && /<[a-z][^>]*>/i.test(String(html));
    const paragraphs = !isHtml && html
        ? String(html).split(/\r?\n\s*\r?\n/).map((s: string) => s.trim()).filter(Boolean)
        : [];
    const featured = (convention.media ?? [])
        .filter((m: any) => m.type === 'IMAGE')
        .slice(0, 2);

    const bodySx = {
        fontFamily: BODY,
        fontSize: '0.95rem',
        lineHeight: 1.7,
        color: 'var(--cc-muted)',
        maxWidth: '62ch',
    } as const;

    return (
        <Box
            sx={{
                display: 'grid',
                // The rail is permanent (photos when they exist, the engagement
                // box always), so the description column reads the same width
                // on every listing.
                gridTemplateColumns: { xs: '1fr', md: '1.7fr 1fr' },
                gap: 3,
                alignItems: 'start',
            }}
        >
            <Box
                sx={{
                    borderRadius: '12px',
                    backgroundColor: 'var(--cc-panel)',
                    border: '1px solid var(--cc-panel-border)',
                    px: { xs: 2.5, md: 4 },
                    py: { xs: 2.5, md: 3.5 },
                }}
            >
                {isHtml ? (
                    <Box
                        sx={{
                            ...bodySx,
                            '& p': { mb: 2 },
                            '& ul, & ol': { mb: 2, pl: 3 },
                            '& li': { mb: 1 },
                            '& h1, & h2, & h3, & h4, & h5, & h6': { mb: 2, mt: 3, color: 'var(--cc-ink)', fontFamily: DISPLAY },
                            '& a': { color: 'var(--cc-cyan)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
                            '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px' },
                            '& blockquote': {
                                borderLeft: '4px solid var(--cc-panel-border)',
                                pl: 2, py: 1, my: 2, fontStyle: 'italic',
                            },
                        }}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                ) : paragraphs.length > 0 ? (
                    paragraphs.map((para: string, i: number) => (
                        <Typography key={i} sx={{ ...bodySx, mb: i < paragraphs.length - 1 ? 2 : 0 }}>
                            {para}
                        </Typography>
                    ))
                ) : (
                    <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                        The organizer hasn&apos;t added a description yet. Check the schedule and
                        pricing tabs, or visit the official site for more.
                    </Typography>
                )}
            </Box>

            {/* The rail: the organizer's showcase shots (first two gallery
                images) when they exist, with the engagement box anchoring it.
                On mobile this stacks below the description. */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {featured.map((photo: any, i: number) => (
                        <Box
                            key={photo.id ?? i}
                            sx={{
                                aspectRatio: '3 / 2',
                                borderRadius: '12px',
                                border: '1px solid var(--cc-panel-border)',
                                overflow: 'hidden',
                                // Subtle zoom on hover (pointer devices only).
                                '@media (hover: hover)': { '&:hover img': { transform: 'scale(1.05)' } },
                            }}
                        >
                            <Box
                                component="img"
                                src={getS3ImageUrl(photo.url)}
                                alt={photo.caption || ''}
                                loading="lazy"
                                sx={{
                                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                    transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                                }}
                            />
                        </Box>
                    ))}
                <EngagementPanel />
            </Box>
        </Box>
    );
}

export default function ConventionListingShell({ convention, canEdit = false, initialTab }: ShellProps) {
    const base = `/conventions/${convention.slug || convention.id}`;

    // Tabs with nothing behind them stay hidden (same rules as the old page).
    const tabs = useMemo<ListingTab[]>(
        () =>
            LISTING_TABS.filter((t) => {
                if (t.key === 'hotels') return (convention.hotels?.length ?? 0) > 0;
                if (t.key === 'dealers') return (convention.dealerLinks?.length ?? 0) > 0;
                if (t.key === 'media') return (convention.media?.length ?? 0) > 0;
                return true;
            }),
        [convention.hotels, convention.dealerLinks, convention.media],
    );

    const [tab, setTab] = useState<ListingTabKey>(
        tabs.some((t) => t.key === initialTab) ? initialTab : 'about',
    );

    // Anchor just above the (sticky) tab bar. On every tab switch we snap the
    // viewport back to it when scrolled past, so a short tab never leaves the
    // reader clamped at the bottom of a collapsed page — the bar stays put
    // visually and the new pane presents from its top.
    const navAnchorRef = useRef<HTMLDivElement | null>(null);
    const snapToTabs = useCallback(() => {
        const doSnap = () => {
            const el = navAnchorRef.current;
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;
            if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
        };
        doSnap();
        // Once more after the new pane has laid out: the browser's own scroll
        // anchoring and the height change both nudge the position post-render.
        requestAnimationFrame(() => requestAnimationFrame(doSnap));
    }, []);

    // Tab switches are client-side; pushState keeps the deep-linkable URL in
    // sync without a server round trip, and popstate honors back/forward.
    const switchTab = useCallback(
        (next: ListingTab) => {
            setTab(next.key);
            snapToTabs();
            window.history.pushState(null, '', next.path ? `${base}/${next.path}` : base);
            try {
                window.fbq?.('track', 'ViewContent', {
                    content_name: `${convention.name} - ${next.label}`,
                    content_category: 'convention_tab',
                });
                window.gtag?.('event', 'view_item', {
                    content_name: `${convention.name} - ${next.label}`,
                    content_category: 'convention_tab',
                });
            } catch {
                /* tracking is best-effort */
            }
        },
        [base, convention.name],
    );

    useEffect(() => {
        const onPop = () => {
            const last = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
            setSlideDir(0);
            setTab(tabKeyForPath(last) ?? 'about');
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    // Swipe between tabs on mobile: a horizontal flick in the pane area moves
    // to the neighboring tab. Vertical scrolling always wins; touches that
    // start inside horizontally scrollable content (pricing tables) or within
    // the screen-edge zone (OS back/forward gestures) are left alone.
    const [slideDir, setSlideDir] = useState(0);
    const touchRef = useRef<{ x: number; y: number } | null>(null);

    const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        touchRef.current = null;
        const t = e.touches[0];
        if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
        let el = e.target as HTMLElement | null;
        while (el && el !== e.currentTarget) {
            if (el.scrollWidth > el.clientWidth + 8) {
                const { overflowX } = window.getComputedStyle(el);
                if (overflowX === 'auto' || overflowX === 'scroll') return;
            }
            el = el.parentElement;
        }
        touchRef.current = { x: t.clientX, y: t.clientY };
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const startPt = touchRef.current;
        touchRef.current = null;
        if (!startPt) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startPt.x;
        const dy = t.clientY - startPt.y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const at = tabs.findIndex((x) => x.key === tab);
        const next = tabs[at + (dx < 0 ? 1 : -1)];
        if (next) {
            setSlideDir(dx < 0 ? 1 : -1);
            switchTab(next);
        }
    }, [tabs, tab, switchTab]);

    const kicker = kickerFor(convention);
    const dates = convention.isTBD || !convention.startDate
        ? 'Dates TBD'
        : formatDateRange(toIso(convention.startDate), toIso(convention.endDate));

    // No selling what's over: the CTA disappears once the convention wraps.
    const registerUrl: string | null = kicker.past
        ? null
        : convention.registrationUrl || convention.websiteUrl || null;
    // No price on the button: the cheapest tier is usually an add-on (spouse,
    // youth, workshop), so "from $X" undersells full registration.
    const registerLabel = 'Register';

    const pane = () => {
        switch (tab) {
            case 'schedule':
                return convention.type === 'FESTIVAL'
                    ? <FestivalSchedule convention={convention} />
                    : <ScheduleSection convention={convention} />;
            case 'pricing':
                return <PricingSection convention={convention} />;
            case 'venue':
                return <VenueSection convention={convention} />;
            case 'hotels':
                return <HotelSection convention={convention} />;
            case 'dealers':
                return <DealersSection convention={convention} />;
            case 'media':
                return <MediaGallerySection convention={convention} />;
            default:
                return <AboutPane convention={convention} />;
        }
    };

    return (
        <Box
            id="main-content"
            component="main"
            sx={{ backgroundColor: 'var(--cc-bg)', backgroundImage: 'var(--cc-field)', minHeight: '100vh' }}
        >
            <Container maxWidth="lg" sx={{ pt: 2.5, pb: { xs: 12, md: 6 } }}>
                {/* ---- banner: clean cover, avatar over its bottom edge ---- */}
                <Box
                    sx={{
                        // Canonical Facebook cover aspect (851×315) — same spec the
                        // uploader crops to, so the art shows uncropped.
                        aspectRatio: '851 / 315',
                        borderRadius: '12px',
                        border: '1px solid var(--cc-panel-border)',
                        overflow: 'hidden',
                        background: 'var(--cc-hero-scene)',
                        backgroundSize: 'var(--cc-hero-bokeh-size)',
                    }}
                >
                    {convention.coverImageUrl && (
                        <Box
                            component="img"
                            src={getS3ImageUrl(convention.coverImageUrl)}
                            alt=""
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', px: { xs: 1.5, md: 2 }, pt: 1.25 }}>
                    <Box
                        sx={{
                            width: { xs: 88, md: 104 },
                            height: { xs: 88, md: 104 },
                            mt: { xs: '-46px', md: '-56px' },
                            flex: 'none',
                            borderRadius: '12px',
                            border: '1px solid var(--cc-panel-border)',
                            backgroundColor: '#ffffff',
                            overflow: 'hidden',
                            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {convention.profileImageUrl ? (
                            <Box
                                component="img"
                                src={getS3ImageUrl(convention.profileImageUrl)}
                                alt=""
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <Typography component="span" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '2rem', color: 'var(--cc-gold)' }}>
                                {(convention.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 1)}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                            suppressHydrationWarning
                            sx={{
                                fontFamily: DISPLAY, fontSize: '0.7rem', fontWeight: 800,
                                letterSpacing: '0.14em', textTransform: 'uppercase',
                                color: kicker.live ? 'var(--cc-live)' : 'var(--cc-cyan)',
                                textShadow: kicker.live ? 'var(--cc-glow-live)' : 'var(--cc-glow-cyan)',
                            }}
                        >
                            {kicker.text}
                            {convention.status !== 'PUBLISHED' && (
                                <Box
                                    component="span"
                                    sx={{
                                        ml: 1, px: 0.75, py: 0.25, borderRadius: '8px',
                                        border: '1px solid var(--cc-panel-border)', color: 'var(--cc-soft)',
                                    }}
                                >
                                    {convention.status}
                                </Box>
                            )}
                        </Typography>
                        <Typography
                            component="h1"
                            sx={{
                                fontFamily: DISPLAY, fontWeight: 800,
                                fontSize: 'clamp(1.5rem, 4.5vw, 2.2rem)', lineHeight: 1.1,
                                letterSpacing: '-0.01em', color: 'var(--cc-ink)', m: 0, mt: 0.25,
                            }}
                        >
                            {convention.name}
                        </Typography>
                        <Typography suppressHydrationWarning sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', mt: 0.5 }}>
                            {locationLine(convention)} · {dates}
                            {convention.websiteUrl && (
                                <>
                                    {' · '}
                                    <Box
                                        component="a"
                                        href={convention.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ color: 'var(--cc-cyan)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        {String(convention.websiteUrl).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗
                                    </Box>
                                </>
                            )}
                        </Typography>
                    </Box>

                    {/* Desktop: the CTA rides in the banner; mobile gets the bottom bar. */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1.5, alignItems: 'center', pt: 1 }}>
                        {canEdit && (
                            <Button
                                component={Link}
                                href={`/organizer/conventions/${convention.id}/edit`}
                                startIcon={<EditIcon />}
                                sx={{
                                    fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none',
                                    color: 'var(--cc-ink)', border: '1px solid var(--cc-panel-border)',
                                    borderRadius: '8px', px: 2, minHeight: 44,
                                }}
                            >
                                Edit
                            </Button>
                        )}
                        {registerUrl && <RegisterButton href={registerUrl} label={registerLabel} compact />}
                    </Box>
                </Box>

                {canEdit && (
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                            component={Link}
                            href={`/organizer/conventions/${convention.id}/edit`}
                            startIcon={<EditIcon />}
                            sx={{
                                fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none',
                                color: 'var(--cc-ink)', border: '1px solid var(--cc-panel-border)',
                                borderRadius: '8px', px: 2, minHeight: 44,
                            }}
                        >
                            Edit convention
                        </Button>
                    </Box>
                )}

                {/* ---- sticky tab bar; every tab is a real URL ---- */}
                {/* Zero-height anchor: the snap target for tab switches (the
                    nav itself reads as top:0 while stuck, so it can't be). */}
                <Box ref={navAnchorRef} aria-hidden />
                <Box
                    component="nav"
                    aria-label="Listing sections"
                    sx={{
                        position: 'sticky', top: 0, zIndex: 20,
                        display: 'flex', overflowX: 'auto',
                        backgroundColor: 'var(--cc-bg)',
                        borderBottom: '2px solid var(--cc-hairline)',
                        mt: 2.5,
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}
                >
                    {tabs.map((t) => (
                        <Box
                            key={t.key}
                            component="a"
                            href={t.path ? `${base}/${t.path}` : base}
                            aria-current={tab === t.key ? 'page' : undefined}
                            onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                setSlideDir(0);
                                switchTab(t);
                            }}
                            sx={{
                                flex: 'none',
                                fontFamily: DISPLAY, fontSize: '0.78rem', fontWeight: 700,
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                textDecoration: 'none',
                                color: tab === t.key ? 'var(--cc-gold)' : 'var(--cc-muted)',
                                borderBottom: '2px solid',
                                borderColor: tab === t.key ? 'var(--cc-gold)' : 'transparent',
                                mb: '-2px',
                                px: 1.75, py: 1.5, minHeight: 44,
                                cursor: 'pointer',
                                '&:hover': { color: 'var(--cc-ink)' },
                                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '-3px' },
                            }}
                        >
                            {t.label}
                        </Box>
                    ))}
                </Box>

                <Box
                    key={tab}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    sx={{
                        pt: 3,
                        // Swiped-in panes glide from the direction of travel;
                        // tapped tabs switch instantly (slideDir 0).
                        ...(slideDir !== 0 && {
                            '@keyframes cc-pane-in': {
                                from: { opacity: 0.3, transform: `translateX(${slideDir * 28}px)` },
                                to: { opacity: 1, transform: 'translateX(0)' },
                            },
                            animation: 'cc-pane-in 0.22s ease-out',
                            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                        }),
                    }}
                >
                    {pane()}
                </Box>
            </Container>

            {/* Mobile: the registration CTA never leaves the screen. */}
            {registerUrl && (
                <Box
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
                        px: 2, pt: 1.25, pb: 2,
                        background: 'linear-gradient(transparent, var(--cc-bg) 45%)',
                    }}
                >
                    <RegisterButton href={registerUrl} label={registerLabel} />
                </Box>
            )}
        </Box>
    );
}
