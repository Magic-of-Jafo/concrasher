'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DISPLAY, BODY } from '@/lib/fonts';

// Shared "House Lights" form kit for the profile surface (2026-07-12). One sx
// object themes every MUI form control beneath it — the same vocabulary as the
// already-themed auth card (AuthForm) — so each profile tab only has to worry
// about layout, not re-styling inputs. Wrap a tab's content in a Box with
// `profileSurfaceSx` and its fields, labels, switches, dividers, and primary /
// outlined buttons all adopt the theme. Modals render in a portal and are not
// reached by this (intentionally — dialogs keep the default look for now).

export const profileSurfaceSx = {
    color: 'var(--cc-ink)',
    fontFamily: BODY,

    // Section titles the tabs render as h5/h6.
    '& .MuiTypography-h4, & .MuiTypography-h5, & .MuiTypography-h6': {
        fontFamily: DISPLAY,
        fontWeight: 800,
        color: 'var(--cc-ink)',
    },

    // Text fields (outlined).
    '& .MuiOutlinedInput-root': {
        fontFamily: BODY,
        color: 'var(--cc-ink)',
        borderRadius: '8px',
        backgroundColor: 'var(--cc-panel)',
        '& fieldset': { borderColor: 'var(--cc-panel-border)' },
        '&:hover fieldset': { borderColor: 'var(--cc-cyan)' },
        '&.Mui-focused fieldset': { borderColor: 'var(--cc-gold)' },
    },
    '& .MuiInputLabel-root': {
        fontFamily: BODY,
        color: 'var(--cc-soft)',
        '&.Mui-focused': { color: 'var(--cc-gold)' },
    },
    '& .MuiFormHelperText-root': { fontFamily: BODY, color: 'var(--cc-soft)' },
    '& textarea::placeholder, & input::placeholder': { color: 'var(--cc-soft)', opacity: 1 },
    // Keep autofilled fields on-theme instead of the browser's white/yellow.
    '& input:-webkit-autofill': {
        WebkitBoxShadow: '0 0 0 100px var(--cc-bg) inset',
        WebkitTextFillColor: 'var(--cc-ink)',
        caretColor: 'var(--cc-ink)',
    },

    // Toggle (e.g. "use stage name publicly").
    '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--cc-gold)' },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
        backgroundColor: 'var(--cc-gold)', opacity: 0.6,
    },

    // Checkboxes and radios — the default outline is invisible on dark.
    '& .MuiCheckbox-root': { color: 'var(--cc-soft)', '&.Mui-checked': { color: 'var(--cc-gold)' } },
    '& .MuiRadio-root': { color: 'var(--cc-soft)', '&.Mui-checked': { color: 'var(--cc-gold)' } },

    // Sortable table headers.
    '& .MuiTableSortLabel-root': {
        color: 'var(--cc-muted)',
        '&:hover, &.Mui-active': { color: 'var(--cc-ink)' },
        '& .MuiTableSortLabel-icon': { color: 'var(--cc-gold) !important' },
    },

    // The tabs wrap content in Paper; on the themed surface those opaque cards
    // would read as white blocks, so make them transparent (modals render in a
    // portal outside this surface and keep their own background).
    '& .MuiPaper-root': { backgroundColor: 'transparent', backgroundImage: 'none', color: 'inherit' },

    // Primary/default chips (talent skills, SEO keywords, etc.) as quiet themed
    // tags. Status chips (success/warning/error/info) keep their colour so they
    // still read as meaning.
    '& .MuiChip-colorPrimary, & .MuiChip-colorDefault': {
        backgroundColor: 'var(--cc-panel)',
        borderColor: 'var(--cc-panel-border)',
        color: 'var(--cc-ink)',
        '& .MuiChip-deleteIcon': { color: 'var(--cc-soft)', '&:hover': { color: 'var(--cc-ink)' } },
    },

    // Toggle buttons (chart/table view switches).
    '& .MuiToggleButton-root': {
        color: 'var(--cc-muted)',
        borderColor: 'var(--cc-panel-border)',
        textTransform: 'none',
        '&.Mui-selected': {
            color: 'var(--cc-gold-ink)',
            backgroundColor: 'var(--cc-gold)',
            '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.05)' },
        },
    },

    // Data tables (admin user list, analytics).
    '& .MuiTableCell-root': { borderColor: 'var(--cc-hairline)', color: 'var(--cc-ink)' },
    '& .MuiTableCell-head': { color: 'var(--cc-muted)', fontWeight: 700, fontFamily: DISPLAY },
    '& .MuiTableRow-hover:hover': { backgroundColor: 'var(--cc-panel)' },

    // Pagination.
    '& .MuiPaginationItem-root': { color: 'var(--cc-ink)' },
    '& .MuiPaginationItem-root.Mui-selected': {
        backgroundColor: 'var(--cc-panel)',
        borderColor: 'var(--cc-panel-border)',
    },

    '& .MuiDivider-root': { borderColor: 'var(--cc-hairline)' },

    // Primary action = gold (the front-page CTA shape); Crash Red stays reserved
    // for Register alone. Secondary = themed outline.
    '& .MuiButton-containedPrimary': {
        backgroundColor: 'var(--cc-gold)',
        color: 'var(--cc-gold-ink)',
        fontFamily: DISPLAY,
        fontWeight: 700,
        textTransform: 'none',
        borderRadius: '8px',
        boxShadow: 'none',
        '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.05)', boxShadow: 'none' },
        '&.Mui-disabled': { backgroundColor: 'var(--cc-panel)', color: 'var(--cc-soft)' },
    },
    '& .MuiButton-outlined': {
        color: 'var(--cc-ink)',
        borderColor: 'var(--cc-panel-border)',
        fontFamily: DISPLAY,
        fontWeight: 700,
        textTransform: 'none',
        borderRadius: '8px',
        '&:hover': { borderColor: 'var(--cc-cyan)', backgroundColor: 'var(--cc-panel)' },
    },

    // Alerts (errors, success, verification prompts): keep the theme surface but
    // let the severity icon carry the meaning.
    '& .MuiAlert-root': {
        backgroundColor: 'var(--cc-panel)',
        color: 'var(--cc-ink)',
        border: '1px solid var(--cc-panel-border)',
        borderRadius: '8px',
        fontFamily: BODY,
    },
    '& .MuiAlert-standardError, & .MuiAlert-outlinedError': { borderColor: 'var(--cc-cta)' },
    '& .MuiAlert-standardSuccess, & .MuiAlert-outlinedSuccess': { borderColor: 'var(--cc-live)' },

    // The bio editor (ProseMirror): theme the toolbar, its icons, and the
    // dropdown menus so the whole control reads on-theme. The link/insert prompt
    // popups render on <body> (outside this surface) and keep the default look.
    '& .ProseMirror': { color: 'var(--cc-ink)', fontFamily: BODY },
    '& .ProseMirror-menubar': {
        backgroundColor: 'var(--cc-panel)',
        color: 'var(--cc-ink)',
        borderBottom: '1px solid var(--cc-panel-border) !important',
    },
    '& .ProseMirror-menuitem': { color: 'var(--cc-ink)' },
    '& .ProseMirror-icon': { color: 'var(--cc-ink)' },
    '& .ProseMirror-icon svg': { fill: 'currentColor' },
    '& .ProseMirror-menuseparator': { borderColor: 'var(--cc-panel-border)' },
    '& .ProseMirror-menu-active': { backgroundColor: 'var(--cc-panel-border)' },
    '& .ProseMirror-menu-dropdown, & .ProseMirror-menu-dropdown-menu': {
        color: 'var(--cc-ink)',
    },
    '& .ProseMirror-menu-dropdown-menu': {
        backgroundColor: 'var(--cc-bg)',
        border: '1px solid var(--cc-panel-border)',
    },
    '& .ProseMirror-menu-dropdown-item:hover': { backgroundColor: 'var(--cc-panel)' },

    // Inline links (verification, @-mentions, etc.).
    '& a:not(.MuiButton-root)': {
        color: 'var(--cc-cyan)',
        textDecorationColor: 'var(--cc-cyan)',
    },
} as const;

/** A themed section title with an optional one-line description. */
export function SectionHeading({
    title,
    description,
    sx,
}: {
    title: string;
    description?: string;
    sx?: object;
}) {
    return (
        <Box sx={{ mb: 2, ...sx }}>
            <Typography
                component="h2"
                sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.15rem', color: 'var(--cc-ink)', lineHeight: 1.2 }}
            >
                {title}
            </Typography>
            {description && (
                <Typography sx={{ fontFamily: BODY, fontSize: '0.85rem', color: 'var(--cc-muted)', mt: 0.5 }}>
                    {description}
                </Typography>
            )}
        </Box>
    );
}
