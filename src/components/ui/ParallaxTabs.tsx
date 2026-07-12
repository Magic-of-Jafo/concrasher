'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

// Reusable "linked-parallax" tab bar, lifted from the convention listing shell
// (2026-07-12): a horizontally scrollable, House-Lights-themed tab strip where
// the bar only nudges a little per tab while the pane travels a full screen, so
// a tab that would hang off a narrow phone (e.g. the last one on a Z Fold) is
// pulled fully into view by the time it's active. Edge fades cue the hidden
// overflow; a thumb-swipe switches tabs and drags the bar proportionally.
//
// Parents own the active key and URL sync; this component owns the visuals and
// the gesture. Styled with the --cc-* tokens so it themes in light and dark.

const DISPLAY = 'var(--font-montserrat), system-ui, arial, sans-serif';

export interface ParallaxTab {
    key: string;
    label: string;
}

interface ParallaxTabsProps {
    tabs: ParallaxTab[];
    /** Active tab key (controlled). */
    value: string;
    onChange: (key: string) => void;
    renderPane: (key: string) => React.ReactNode;
    ariaLabel?: string;
    /** Optional sx merged onto the outer wrapper (e.g. a themed background). */
    sx?: object;
}

export default function ParallaxTabs({
    tabs,
    value,
    onChange,
    renderPane,
    ariaLabel = 'Sections',
    sx,
}: ParallaxTabsProps) {
    const navRef = useRef<HTMLElement | null>(null);
    const navAnchorRef = useRef<HTMLDivElement | null>(null);
    const paneRef = useRef<HTMLDivElement | null>(null);
    const firstScrollRef = useRef(true);
    const [edges, setEdges] = useState({ left: false, right: false });
    const [slideDir, setSlideDir] = useState(0);

    const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === value));

    // Deterministic scroll position that brings tab `index` into view (centered,
    // clamped to the ends), so the live drag can interpolate between two tabs.
    const scrollTargetFor = useCallback((index: number): number => {
        const nav = navRef.current;
        if (!nav) return 0;
        const el = nav.children[index] as HTMLElement | undefined;
        if (!el) return 0;
        const maxScroll = nav.scrollWidth - nav.clientWidth;
        if (maxScroll <= 0) return 0;
        const navRect = nav.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const elLeftInContent = (elRect.left - navRect.left) + nav.scrollLeft;
        const center = elLeftInContent + elRect.width / 2 - nav.clientWidth / 2;
        return Math.max(0, Math.min(center, maxScroll));
    }, []);

    const updateEdges = useCallback(() => {
        const nav = navRef.current;
        if (!nav) return;
        const maxScroll = nav.scrollWidth - nav.clientWidth;
        setEdges({ left: nav.scrollLeft > 1, right: nav.scrollLeft < maxScroll - 1 });
    }, []);

    // Snap the window to just above the sticky bar on a tab switch, so a short
    // pane never leaves the reader stranded mid-page.
    const snapToTabs = useCallback(() => {
        const anchorTop = () => {
            const el = navAnchorRef.current;
            return el ? el.getBoundingClientRect().top + window.scrollY : null;
        };
        const top = anchorTop();
        if (top === null || window.scrollY <= top) return;
        window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const t = anchorTop();
            if (t !== null) window.scrollTo({ top: t, behavior: 'instant' as ScrollBehavior });
        }));
    }, []);

    // Glide the bar to the active tab whenever it changes (tap, swipe, deep link).
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const reduce = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        nav.scrollTo({ left: scrollTargetFor(activeIndex), behavior: (firstScrollRef.current || reduce) ? 'auto' : 'smooth' });
        firstScrollRef.current = false;
    }, [value, tabs, activeIndex, scrollTargetFor]);

    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        updateEdges();
        nav.addEventListener('scroll', updateEdges, { passive: true });
        window.addEventListener('resize', updateEdges);
        return () => {
            nav.removeEventListener('scroll', updateEdges);
            window.removeEventListener('resize', updateEdges);
        };
    }, [updateEdges, tabs]);

    // ---- swipe between tabs (mirrors the listing gesture) ----
    const tabsRef = useRef(tabs);
    useEffect(() => { tabsRef.current = tabs; }, [tabs]);
    const activeIndexRef = useRef(activeIndex);
    useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const commit = useCallback((nextIndex: number, dir: number) => {
        const list = tabsRef.current;
        const next = list[nextIndex];
        if (!next) return;
        setSlideDir(dir);
        snapToTabs();
        onChangeRef.current(next.key);
    }, [snapToTabs]);
    const commitRef = useRef(commit);
    useEffect(() => { commitRef.current = commit; }, [commit]);

    useEffect(() => {
        const pane = paneRef.current;
        if (!pane) return;
        let gesture: { x: number; y: number; mode: 'undecided' | 'horizontal' | 'vertical' } | null = null;

        const onStart = (e: TouchEvent) => {
            gesture = null;
            if (e.touches.length !== 1) return;
            const t = e.touches[0];
            // Leave the screen-edge zone to OS back/forward gestures.
            if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
            // Don't hijack drags that belong to the content: horizontally
            // scrollable regions, and form controls (inputs, sliders, buttons,
            // links, editors) — the profile panes are full of these.
            let el = e.target as HTMLElement | null;
            while (el && el !== pane) {
                if (el.scrollWidth > el.clientWidth + 8) {
                    const { overflowX } = window.getComputedStyle(el);
                    if (overflowX === 'auto' || overflowX === 'scroll') return;
                }
                const tag = el.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
                    || tag === 'BUTTON' || tag === 'A' || tag === 'LABEL'
                    || el.isContentEditable
                    || el.getAttribute('role') === 'slider'
                    || el.classList.contains('MuiSlider-root')) return;
                el = el.parentElement;
            }
            gesture = { x: t.clientX, y: t.clientY, mode: 'undecided' };
        };

        const onMove = (e: TouchEvent) => {
            if (!gesture) return;
            const t = e.touches[0];
            const dx = t.clientX - gesture.x;
            const dy = t.clientY - gesture.y;
            if (gesture.mode === 'undecided') {
                if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
                gesture.mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'horizontal' : 'vertical';
            }
            if (gesture.mode === 'horizontal') {
                e.preventDefault();
                const nav = navRef.current;
                if (nav) {
                    const W = pane.clientWidth || window.innerWidth || 1;
                    const at = activeIndexRef.current;
                    const nextIdx = at + (dx < 0 ? 1 : -1);
                    if (at >= 0 && nextIdx >= 0 && nextIdx < tabsRef.current.length) {
                        const frac = Math.min(1, Math.abs(dx) / W);
                        const cur = scrollTargetFor(at);
                        const nb = scrollTargetFor(nextIdx);
                        nav.scrollLeft = cur + (nb - cur) * frac;
                    }
                }
            }
        };

        const onEnd = (e: TouchEvent) => {
            const g = gesture;
            gesture = null;
            if (!g || g.mode !== 'horizontal') return;
            const dx = e.changedTouches[0].clientX - g.x;
            const at = activeIndexRef.current;
            if (Math.abs(dx) >= 60) {
                commitRef.current(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
            } else {
                const nav = navRef.current;
                if (nav && at >= 0) nav.scrollTo({ left: scrollTargetFor(at), behavior: 'smooth' });
            }
        };

        const onCancel = () => {
            const g = gesture;
            gesture = null;
            if (g && g.mode === 'horizontal') {
                const nav = navRef.current;
                const at = activeIndexRef.current;
                if (nav && at >= 0) nav.scrollTo({ left: scrollTargetFor(at), behavior: 'smooth' });
            }
        };

        pane.addEventListener('touchstart', onStart, { passive: true });
        pane.addEventListener('touchmove', onMove, { passive: false });
        pane.addEventListener('touchend', onEnd, { passive: true });
        pane.addEventListener('touchcancel', onCancel, { passive: true });
        return () => {
            pane.removeEventListener('touchstart', onStart);
            pane.removeEventListener('touchmove', onMove);
            pane.removeEventListener('touchend', onEnd);
            pane.removeEventListener('touchcancel', onCancel);
        };
        // The pane node remounts per tab (key={value}), so re-attach each switch.
    }, [value, scrollTargetFor]);

    return (
        <Box sx={sx}>
            {/* Zero-height snap target (the sticky nav can't be its own anchor). */}
            <Box ref={navAnchorRef} aria-hidden />
            <Box sx={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'var(--cc-bg)' }}>
                <Box
                    component="nav"
                    ref={navRef}
                    aria-label={ariaLabel}
                    sx={{
                        display: 'flex', overflowX: 'auto',
                        borderBottom: '2px solid var(--cc-hairline)',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}
                >
                    {tabs.map((t) => (
                        <Box
                            key={t.key}
                            component="button"
                            type="button"
                            aria-current={t.key === value ? 'page' : undefined}
                            onClick={() => {
                                setSlideDir(0);
                                snapToTabs();
                                onChange(t.key);
                            }}
                            sx={{
                                flex: 'none',
                                fontFamily: DISPLAY, fontSize: '0.78rem', fontWeight: 700,
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                background: 'none', border: 'none', whiteSpace: 'nowrap',
                                color: t.key === value ? 'var(--cc-gold)' : 'var(--cc-muted)',
                                borderBottom: '2px solid',
                                borderColor: t.key === value ? 'var(--cc-gold)' : 'transparent',
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
                    aria-hidden
                    sx={{
                        position: 'absolute', left: 0, top: 0, bottom: 2, width: 24,
                        pointerEvents: 'none',
                        background: 'linear-gradient(to right, var(--cc-bg), transparent)',
                        opacity: edges.left ? 1 : 0, transition: 'opacity 0.15s ease',
                    }}
                />
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute', right: 0, top: 0, bottom: 2, width: 32,
                        pointerEvents: 'none',
                        background: 'linear-gradient(to left, var(--cc-bg), transparent)',
                        opacity: edges.right ? 1 : 0, transition: 'opacity 0.15s ease',
                    }}
                />
            </Box>

            <Box
                key={value}
                ref={paneRef}
                sx={{
                    pt: 3,
                    minHeight: 'calc(100vh - 60px)',
                    overflowAnchor: 'none',
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
                {renderPane(value)}
            </Box>
        </Box>
    );
}
