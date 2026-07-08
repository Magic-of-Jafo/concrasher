'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DISPLAY } from './FrontPage';

// DEV-ONLY palette switcher: overrides the --cc-* variables with candidate
// palettes so the real page can be judged in both themes. Each palette is a
// full hand-tuned token set (dark + light), not a naive 4-color swap. Renders
// only in development; delete once a palette is chosen.

type Vars = Record<string, string>;

interface Palette {
    key: string;
    label: string;
    /** null = the shipped Electric Night defaults (remove the override). */
    dark: Vars | null;
    light: Vars | null;
}

const STORAGE_KEY = 'cc-palette-test';
const STYLE_ID = 'cc-palette-test-style';

// colorhunt.co/palette/000000282a3a735f32c69749
const MIDNIGHT_GOLD: Palette = {
    key: 'gold',
    label: 'Midnight Gold',
    dark: {
        bg: '#000000', panel: 'rgba(40,42,58,.45)', 'panel-border': 'rgba(198,151,73,.45)', hairline: 'rgba(40,42,58,.95)',
        ink: '#f4edde', muted: '#c9bfa8', soft: '#8e8871',
        magenta: '#c69749', cyan: '#a9b4d6', gold: '#c69749', 'gold-ink': '#191307', live: '#7fe0a0',
        'majors-bg': 'linear-gradient(160deg, rgba(198,151,73,.14), rgba(40,42,58,.5))', 'majors-border': 'rgba(198,151,73,.4)',
        'glow-magenta': '0 0 8px rgba(198,151,73,.8), 0 0 26px rgba(198,151,73,.45)', 'glow-cyan': '0 0 12px rgba(169,180,214,.5)',
        'glow-live': '0 0 10px rgba(127,224,160,.7)', 'glow-gold': '0 0 20px rgba(198,151,73,.4)',
        'glow-art': '0 0 22px rgba(244,237,222,.4)', 'glow-logo': 'drop-shadow(0 0 16px rgba(198,151,73,.45))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(115,95,50,.55), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(198,151,73,.12), transparent 70%)',
    },
    light: {
        bg: '#f6f1e6', panel: 'rgba(115,95,50,.07)', 'panel-border': 'rgba(115,95,50,.35)', hairline: 'rgba(115,95,50,.25)',
        ink: '#171410', muted: '#4e4635', soft: '#7a7057',
        magenta: '#8a6414', cyan: '#3a4568', gold: '#c69749', 'gold-ink': '#191307', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(198,151,73,.1), rgba(40,42,58,.06))', 'majors-border': 'rgba(115,95,50,.4)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(25,19,7,.25)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(198,151,73,.14), transparent 65%)',
    },
};

// colorhunt.co/palette/1919192d4263c84b31ecdbba
const EMBER: Palette = {
    key: 'ember',
    label: 'Ember',
    dark: {
        bg: '#191919', panel: 'rgba(45,66,99,.28)', 'panel-border': 'rgba(45,66,99,.75)', hairline: 'rgba(45,66,99,.5)',
        ink: '#f1e7d6', muted: '#cbbfa9', soft: '#8e8878',
        magenta: '#e25a3d', cyan: '#7c9cc9', gold: '#ecdbba', 'gold-ink': '#191919', live: '#7fe0a0',
        'majors-bg': 'linear-gradient(160deg, rgba(200,75,49,.16), rgba(45,66,99,.3))', 'majors-border': 'rgba(200,75,49,.45)',
        'glow-magenta': '0 0 8px rgba(226,90,61,.8), 0 0 26px rgba(226,90,61,.4)', 'glow-cyan': '0 0 12px rgba(124,156,201,.5)',
        'glow-live': '0 0 10px rgba(127,224,160,.7)', 'glow-gold': '0 0 20px rgba(236,219,186,.3)',
        'glow-art': '0 0 22px rgba(241,231,214,.4)', 'glow-logo': 'drop-shadow(0 0 16px rgba(226,90,61,.4))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(45,66,99,.55), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(200,75,49,.14), transparent 70%)',
    },
    light: {
        bg: '#efe3c8', panel: 'rgba(45,66,99,.06)', 'panel-border': 'rgba(45,66,99,.35)', hairline: 'rgba(45,66,99,.22)',
        ink: '#191919', muted: '#4e4636', soft: '#7b715c',
        magenta: '#b03a20', cyan: '#2d4263', gold: '#c84b31', 'gold-ink': '#fff8ee', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(200,75,49,.08), rgba(45,66,99,.07))', 'majors-border': 'rgba(200,75,49,.4)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(25,25,25,.3)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(45,66,99,.12), transparent 65%)',
    },
};

// colorhunt.co/palette/0d0b61294669478b8de4d329
const ABYSS: Palette = {
    key: 'abyss',
    label: 'Abyss',
    dark: {
        bg: '#0d0b61', panel: 'rgba(41,70,105,.35)', 'panel-border': 'rgba(71,139,141,.6)', hairline: 'rgba(41,70,105,.65)',
        ink: '#eef4f4', muted: '#bfd3d6', soft: '#8fa6bc',
        magenta: '#e4d329', cyan: '#61c6c9', gold: '#e4d329', 'gold-ink': '#14123b', live: '#7fe0a0',
        'majors-bg': 'linear-gradient(160deg, rgba(228,211,41,.12), rgba(41,70,105,.4))', 'majors-border': 'rgba(71,139,141,.55)',
        'glow-magenta': '0 0 8px rgba(228,211,41,.7), 0 0 26px rgba(228,211,41,.35)', 'glow-cyan': '0 0 12px rgba(97,198,201,.6)',
        'glow-live': '0 0 10px rgba(127,224,160,.7)', 'glow-gold': '0 0 20px rgba(228,211,41,.35)',
        'glow-art': '0 0 22px rgba(238,244,244,.45)', 'glow-logo': 'drop-shadow(0 0 16px rgba(97,198,201,.45))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(41,70,105,.65), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(71,139,141,.25), transparent 70%)',
    },
    light: {
        bg: '#f1f6f5', panel: 'rgba(71,139,141,.07)', 'panel-border': 'rgba(71,139,141,.4)', hairline: 'rgba(41,70,105,.22)',
        ink: '#101443', muted: '#3a4663', soft: '#67748f',
        magenta: '#2e6b6e', cyan: '#294669', gold: '#294669', 'gold-ink': '#f1f6f5', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(71,139,141,.09), rgba(41,70,105,.07))', 'majors-border': 'rgba(71,139,141,.45)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(16,20,67,.3)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(71,139,141,.14), transparent 65%)',
    },
};

// colorhunt.co/palette/1e201e3c3d37697565ecdfcc
const GREENROOM: Palette = {
    key: 'greenroom',
    label: 'Greenroom',
    dark: {
        bg: '#1e201e', panel: 'rgba(60,61,55,.5)', 'panel-border': 'rgba(105,117,101,.6)', hairline: 'rgba(60,61,55,.95)',
        ink: '#ecdfcc', muted: '#c2c6b4', soft: '#8b937f',
        magenta: '#b9cb9e', cyan: '#9ba88f', gold: '#ecdfcc', 'gold-ink': '#1e201e', live: '#8fce9f',
        'majors-bg': 'linear-gradient(160deg, rgba(105,117,101,.22), rgba(60,61,55,.5))', 'majors-border': 'rgba(105,117,101,.55)',
        'glow-magenta': '0 0 8px rgba(185,203,158,.6), 0 0 26px rgba(185,203,158,.3)', 'glow-cyan': '0 0 12px rgba(155,168,143,.5)',
        'glow-live': '0 0 10px rgba(143,206,159,.6)', 'glow-gold': '0 0 20px rgba(236,223,204,.25)',
        'glow-art': '0 0 22px rgba(236,223,204,.4)', 'glow-logo': 'drop-shadow(0 0 16px rgba(185,203,158,.35))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(60,61,55,.75), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(105,117,101,.25), transparent 70%)',
    },
    light: {
        bg: '#ecdfcc', panel: 'rgba(105,117,101,.1)', 'panel-border': 'rgba(105,117,101,.45)', hairline: 'rgba(60,61,55,.25)',
        ink: '#1e201e', muted: '#4a4d42', soft: '#71755f',
        magenta: '#4f6142', cyan: '#3c3d37', gold: '#1e201e', 'gold-ink': '#ecdfcc', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(105,117,101,.12), rgba(60,61,55,.08))', 'majors-border': 'rgba(105,117,101,.5)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(30,32,30,.3)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(105,117,101,.16), transparent 65%)',
    },
};

// colorhunt.co/palette/222831393e46948979dfd0b8
const SLATE: Palette = {
    key: 'slate',
    label: 'Slate & Taupe',
    dark: {
        bg: '#222831', panel: 'rgba(57,62,70,.55)', 'panel-border': 'rgba(148,137,121,.5)', hairline: 'rgba(57,62,70,.95)',
        ink: '#dfd0b8', muted: '#b9ad99', soft: '#8a8d94',
        magenta: '#dfd0b8', cyan: '#a8b3c4', gold: '#dfd0b8', 'gold-ink': '#222831', live: '#7fe0a0',
        'majors-bg': 'linear-gradient(160deg, rgba(148,137,121,.18), rgba(57,62,70,.5))', 'majors-border': 'rgba(148,137,121,.45)',
        'glow-magenta': '0 0 8px rgba(223,208,184,.5), 0 0 26px rgba(223,208,184,.25)', 'glow-cyan': '0 0 12px rgba(168,179,196,.45)',
        'glow-live': '0 0 10px rgba(127,224,160,.6)', 'glow-gold': '0 0 20px rgba(223,208,184,.25)',
        'glow-art': '0 0 22px rgba(223,208,184,.4)', 'glow-logo': 'drop-shadow(0 0 16px rgba(148,137,121,.4))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(57,62,70,.8), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(148,137,121,.18), transparent 70%)',
    },
    light: {
        bg: '#ede4d3', panel: 'rgba(57,62,70,.06)', 'panel-border': 'rgba(57,62,70,.35)', hairline: 'rgba(57,62,70,.22)',
        ink: '#222831', muted: '#4b4f57', soft: '#767b84',
        magenta: '#6e6350', cyan: '#393e46', gold: '#222831', 'gold-ink': '#dfd0b8', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(148,137,121,.14), rgba(57,62,70,.07))', 'majors-border': 'rgba(148,137,121,.5)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(34,40,49,.3)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(148,137,121,.18), transparent 65%)',
    },
};

// colorhunt.co/palette/210f374f1c51a55b4bdca06d
const VELVET_PLUM: Palette = {
    key: 'plum',
    label: 'Velvet Plum',
    dark: {
        bg: '#210f37', panel: 'rgba(79,28,81,.4)', 'panel-border': 'rgba(165,91,75,.55)', hairline: 'rgba(79,28,81,.75)',
        ink: '#f4e7da', muted: '#d4bfae', soft: '#9c86a8',
        magenta: '#dca06d', cyan: '#c77bc9', gold: '#dca06d', 'gold-ink': '#2a1230', live: '#7fe0a0',
        'majors-bg': 'linear-gradient(160deg, rgba(165,91,75,.2), rgba(79,28,81,.4))', 'majors-border': 'rgba(165,91,75,.5)',
        'glow-magenta': '0 0 8px rgba(220,160,109,.7), 0 0 26px rgba(220,160,109,.35)', 'glow-cyan': '0 0 12px rgba(199,123,201,.55)',
        'glow-live': '0 0 10px rgba(127,224,160,.7)', 'glow-gold': '0 0 20px rgba(220,160,109,.35)',
        'glow-art': '0 0 22px rgba(244,231,218,.45)', 'glow-logo': 'drop-shadow(0 0 16px rgba(220,160,109,.4))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(79,28,81,.6), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(165,91,75,.2), transparent 70%)',
    },
    light: {
        bg: '#f7efe6', panel: 'rgba(79,28,81,.06)', 'panel-border': 'rgba(79,28,81,.32)', hairline: 'rgba(79,28,81,.22)',
        ink: '#210f37', muted: '#4a3560', soft: '#7a6690',
        magenta: '#a5452f', cyan: '#4f1c51', gold: '#dca06d', 'gold-ink': '#210f37', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(165,91,75,.1), rgba(79,28,81,.07))', 'majors-border': 'rgba(165,91,75,.45)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(33,15,55,.3)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(79,28,81,.12), transparent 65%)',
    },
};

// The runner-up, kept for comparison (was the shipped default before the
// Midnight Gold × Abyss decision).
const ELECTRIC_NIGHT: Palette = {
    key: 'violet',
    label: 'Electric Night (old)',
    dark: {
        bg: '#14032b', panel: 'rgba(122,44,240,.14)', 'panel-border': 'rgba(122,44,240,.5)', hairline: 'rgba(122,44,240,.3)',
        ink: '#f3ecff', muted: '#c9b6ea', soft: '#8f7bb1',
        magenta: '#ff2e88', cyan: '#29e6ff', gold: '#ffd76a', 'gold-ink': '#2b1150', live: '#6dffb0',
        'majors-bg': 'linear-gradient(160deg, rgba(255,46,136,.14), rgba(122,44,240,.16))', 'majors-border': 'rgba(255,46,136,.4)',
        'glow-magenta': '0 0 8px rgba(255,46,136,.8), 0 0 26px rgba(255,46,136,.5)', 'glow-cyan': '0 0 12px rgba(41,230,255,.6)',
        'glow-live': '0 0 10px rgba(109,255,176,.7)', 'glow-gold': '0 0 20px rgba(255,215,106,.35)',
        'glow-art': '0 0 22px rgba(243,236,255,.45)', 'glow-logo': 'drop-shadow(0 0 16px rgba(255,46,136,.5))',
        field: 'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(122,44,240,.55), transparent 65%), radial-gradient(ellipse 40% 22% at 88% 20%, rgba(255,46,136,.16), transparent 70%)',
    },
    light: {
        bg: '#f7f4fc', panel: 'rgba(109,40,217,.06)', 'panel-border': 'rgba(109,40,217,.3)', hairline: 'rgba(109,40,217,.22)',
        ink: '#1d1035', muted: '#4b3a6e', soft: '#6b5c8f',
        magenta: '#c40e63', cyan: '#6d28d9', gold: '#f2c04b', 'gold-ink': '#2b1150', live: '#0a7a43',
        'majors-bg': 'linear-gradient(160deg, rgba(196,14,99,.07), rgba(109,40,217,.08))', 'majors-border': 'rgba(196,14,99,.35)',
        'glow-magenta': 'none', 'glow-cyan': 'none', 'glow-live': 'none', 'glow-gold': '0 2px 0 rgba(43,17,80,.25)',
        'glow-art': 'none', 'glow-logo': 'none',
        field: 'radial-gradient(ellipse 75% 30% at 50% -4%, rgba(122,44,240,.12), transparent 65%)',
    },
};

const PALETTES: Palette[] = [
    { key: 'night', label: 'Chosen: Gold × Abyss', dark: null, light: null },
    ELECTRIC_NIGHT,
    MIDNIGHT_GOLD,
    EMBER,
    ABYSS,
    GREENROOM,
    SLATE,
    VELVET_PLUM,
];

function block(selector: string, vars: Vars): string {
    const body = Object.entries(vars).map(([k, v]) => `--cc-${k}: ${v};`).join(' ');
    return `${selector} { ${body} }`;
}

function applyPalette(p: Palette) {
    const existing = document.getElementById(STYLE_ID);
    if (!p.dark || !p.light) {
        existing?.remove();
        return;
    }
    const css = `${block(':root', p.dark)}\n${block('[data-theme="light"]', p.light)}`;
    if (existing) {
        existing.textContent = css;
    } else {
        const el = document.createElement('style');
        el.id = STYLE_ID;
        el.textContent = css;
        document.head.appendChild(el);
    }
}

export default function PaletteTester() {
    const [active, setActive] = useState('night');

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const p = PALETTES.find((x) => x.key === saved);
        if (p) {
            setActive(p.key);
            applyPalette(p);
        }
    }, []);

    const pick = (p: Palette) => {
        setActive(p.key);
        applyPalette(p);
        try { localStorage.setItem(STORAGE_KEY, p.key); } catch { /* private mode */ }
    };

    return (
        <Box
            sx={{
                position: 'fixed', bottom: 16, right: 16, zIndex: 1400,
                backgroundColor: 'rgba(10,10,14,.92)', border: '1px solid rgba(255,255,255,.25)',
                borderRadius: '8px', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5,
                boxShadow: '0 8px 30px rgba(0,0,0,.5)',
            }}
        >
            <Typography sx={{ fontFamily: DISPLAY, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>
                Palette test (dev only)
            </Typography>
            {PALETTES.map((p) => (
                <Box
                    key={p.key}
                    component="button"
                    type="button"
                    onClick={() => pick(p)}
                    sx={{
                        fontFamily: DISPLAY, fontSize: '0.75rem', fontWeight: 700, textAlign: 'left',
                        color: active === p.key ? '#ffd76a' : '#fff',
                        backgroundColor: active === p.key ? 'rgba(255,215,106,.12)' : 'transparent',
                        border: 'none', borderRadius: '4px', px: 1, py: 0.5, cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,.1)' },
                    }}
                >
                    {active === p.key ? '● ' : '○ '}{p.label}
                </Box>
            ))}
        </Box>
    );
}
