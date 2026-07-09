'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DISPLAY, BODY } from './FrontPage';

// DEV-ONLY wallpaper tuner: sliders for the damask pattern's visibility, tint
// strength, blend mode, and tile size, per theme. Edits whichever theme is
// currently active (flip House Lights to tune the other). Values persist in
// localStorage and display as a readout; once dialed in, the numbers get baked
// into globals.css and this component gets deleted.

interface Tune {
    opacity: number;
    tint: number; // 0..1 strength of the theme's tint color over the gray
    blend: string;
    size: number; // tile px
}

interface State {
    dark: Tune;
    light: Tune;
}

const DEFAULTS: State = {
    dark: { opacity: 0.14, tint: 1, blend: 'overlay', size: 560 },
    light: { opacity: 0.14, tint: 1, blend: 'color', size: 560 },
};

const TINT_RGB = { dark: '198, 151, 73', light: '41, 70, 105' } as const;
const BLENDS = ['overlay', 'soft-light', 'multiply', 'screen', 'luminosity', 'color', 'normal'];
const STORAGE_KEY = 'cc-pattern-tune';
const STYLE_ID = 'cc-pattern-tune-style';

function block(selector: string, theme: 'dark' | 'light', t: Tune): string {
    return `${selector} {
  --cc-pattern-overlay: linear-gradient(rgba(${TINT_RGB[theme]}, ${t.tint}), rgba(${TINT_RGB[theme]}, ${t.tint}));
  --cc-pattern-blend: ${t.blend};
  --cc-pattern-opacity: ${t.opacity};
  --cc-pattern-size: ${t.size}px;
}`;
}

function apply(state: State) {
    const css = `${block(':root', 'dark', state.dark)}\n${block('[data-theme="light"]', 'light', state.light)}`;
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = css;
}

export default function PatternTuner() {
    const [state, setState] = useState<State>(DEFAULTS);
    const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');

    // Follow the House Lights toggle so the sliders always edit what's on screen.
    useEffect(() => {
        const read = () => setActiveTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
        read();
        const mo = new MutationObserver(read);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => mo.disconnect();
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = { ...DEFAULTS, ...JSON.parse(saved) } as State;
                setState(parsed);
                apply(parsed);
            }
        } catch { /* corrupted state: stay on defaults */ }
    }, []);

    const update = useCallback((patch: Partial<Tune>) => {
        setState((prev) => {
            const next = { ...prev, [activeTheme]: { ...prev[activeTheme], ...patch } };
            apply(next);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
            return next;
        });
    }, [activeTheme]);

    const reset = useCallback(() => {
        setState(DEFAULTS);
        apply(DEFAULTS);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
    }, []);

    const t = state[activeTheme];
    const labelSx = {
        fontFamily: DISPLAY, fontSize: '0.6rem', fontWeight: 800,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)',
        display: 'flex', justifyContent: 'space-between', gap: 1,
    } as const;

    return (
        <Box
            sx={{
                position: 'fixed', bottom: 16, left: 16, zIndex: 1400, width: 230,
                backgroundColor: 'rgba(10,10,14,.94)', border: '1px solid rgba(255,255,255,.25)',
                borderRadius: '8px', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1,
                boxShadow: '0 8px 30px rgba(0,0,0,.5)',
                '& input[type=range]': { width: '100%', accentColor: '#ffd76a', cursor: 'pointer' },
                '& select': {
                    width: '100%', backgroundColor: '#1c1c24', color: '#fff', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: '4px', padding: '4px 6px', fontSize: '0.75rem',
                },
            }}
        >
            <Typography sx={{ ...labelSx, color: '#ffd76a' }}>
                Pattern tuner (dev)
                <span>editing: {activeTheme.toUpperCase()}</span>
            </Typography>

            <Typography component="label" sx={labelSx}>
                Visibility <span>{t.opacity.toFixed(3)}</span>
                <Box component="input" type="range" min={0} max={0.5} step={0.005}
                    value={t.opacity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ opacity: Number(e.target.value) })} />
            </Typography>

            <Typography component="label" sx={labelSx}>
                Tint strength <span>{t.tint.toFixed(2)}</span>
                <Box component="input" type="range" min={0} max={1} step={0.05}
                    value={t.tint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ tint: Number(e.target.value) })} />
            </Typography>

            <Typography component="label" sx={labelSx}>
                Tile size <span>{t.size}px</span>
                <Box component="input" type="range" min={240} max={980} step={20}
                    value={t.size} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ size: Number(e.target.value) })} />
            </Typography>

            <Typography component="label" sx={labelSx}>
                Blend
                <Box component="select" value={t.blend}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update({ blend: e.target.value })}>
                    {BLENDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </Box>
            </Typography>

            <Typography sx={{ fontFamily: BODY, fontSize: '0.62rem', lineHeight: 1.5, color: 'rgba(255,255,255,.65)' }}>
                dark: {state.dark.opacity.toFixed(3)} · {state.dark.blend} · tint {state.dark.tint.toFixed(2)} · {state.dark.size}px
                <br />
                light: {state.light.opacity.toFixed(3)} · {state.light.blend} · tint {state.light.tint.toFixed(2)} · {state.light.size}px
            </Typography>

            <Box
                component="button"
                type="button"
                onClick={reset}
                sx={{
                    fontFamily: DISPLAY, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#fff', backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,.3)', borderRadius: '4px', px: 1, py: 0.5,
                    cursor: 'pointer', '&:hover': { borderColor: '#ffd76a' },
                }}
            >
                Reset to defaults
            </Box>
        </Box>
    );
}
