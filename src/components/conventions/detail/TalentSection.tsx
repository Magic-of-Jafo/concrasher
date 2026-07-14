'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { getS3ImageUrl } from '@/lib/defaults';
import { resolveTalentCardImage } from '@/lib/talent-cards';

// The public Talent tab: who's featured at this convention. Cards are the
// organizer's billing order — and billing is hierarchy: the first row renders
// poster-size (the headliners), the rest smaller. Each card links to the
// talent's profile page. Images follow the talent-controls-promotion rule
// (resolveTalentCardImage); a card with no image at all gets a monogram.

const DISPLAY = 'var(--font-montserrat), system-ui, arial, sans-serif';
const BODY = 'var(--font-open-sans), system-ui, arial, sans-serif';

interface TalentLinkRow {
    id: string;
    isVisible?: boolean | null;
    isHeadliner?: boolean | null;
    imageUrl?: string | null;
    overrideDisplayName?: string | null;
    talentProfile: {
        id: string;
        displayName: string;
        profilePictureUrl?: string | null;
        media?: Array<{ url: string; type: string }>;
    };
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Visible talent rows in billing order — shared with the shell's tab gate and About teaser. */
export function visibleTalentRows(convention: any): TalentLinkRow[] {
    return ((convention?.talent ?? []) as TalentLinkRow[]).filter((r) => r.isVisible !== false);
}

/** The resolved card image for a row (promo photo > organizer image > profile pic > none). */
export function talentRowImage(row: TalentLinkRow): string | null {
    const promoUrls = (row.talentProfile.media ?? [])
        .filter((m) => m.type === 'PROMO_IMAGE')
        .map((m) => m.url);
    return resolveTalentCardImage({
        chosenUrl: row.imageUrl ?? null,
        promoUrls,
        profilePictureUrl: row.talentProfile.profilePictureUrl ?? null,
    }).url;
}

function TalentCard({ row, big }: { row: TalentLinkRow; big: boolean }) {
    const name = row.overrideDisplayName || row.talentProfile.displayName;
    const imageUrl = talentRowImage(row);

    return (
        <Box
            component="a"
            href={`/t/${row.talentProfile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
                display: 'block',
                textDecoration: 'none',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--cc-panel-border)',
                backgroundColor: 'var(--cc-panel)',
                transition: 'border-color 0.18s ease-out, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                '&:hover': { borderColor: 'var(--cc-gold)', transform: 'translateY(-3px)' },
                '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '2px' },
                '@media (prefers-reduced-motion: reduce)': { transition: 'border-color 0.18s', '&:hover': { transform: 'none' } },
            }}
        >
            <Box sx={{ position: 'relative', aspectRatio: '4 / 5', backgroundColor: 'var(--cc-bg)' }}>
                {imageUrl ? (
                    <Box
                        component="img"
                        src={getS3ImageUrl(imageUrl)}
                        alt={name}
                        loading="lazy"
                        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <Box
                        sx={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: DISPLAY, fontWeight: 800, color: 'var(--cc-soft)',
                            fontSize: big ? '3rem' : '2rem',
                        }}
                    >
                        {initials(name)}
                    </Box>
                )}
            </Box>
            <Typography
                sx={{
                    fontFamily: DISPLAY, fontWeight: 800, color: 'var(--cc-ink)',
                    fontSize: big ? { xs: '1rem', sm: '1.15rem' } : '0.9rem',
                    lineHeight: 1.2, px: 1.5, py: 1.25, textWrap: 'balance',
                }}
            >
                {name}
            </Typography>
        </Box>
    );
}

export default function TalentSection({ convention }: { convention: any }) {
    const rows = visibleTalentRows(convention);
    if (rows.length === 0) {
        return (
            <Typography sx={{ fontFamily: BODY, color: 'var(--cc-muted)', textAlign: 'center', py: 6 }}>
                Talent for this convention hasn&apos;t been announced yet.
            </Typography>
        );
    }

    // Top billing is an explicit organizer choice (starred in the editor) —
    // never inferred from list position. Zero headliners = one uniform grid;
    // nobody gets accidental poster treatment.
    const headliners = rows.filter((r) => r.isHeadliner === true);
    const supporting = rows.filter((r) => r.isHeadliner !== true);

    return (
        <Box>
            {headliners.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: `repeat(${Math.min(headliners.length, 3)}, minmax(0, 260px))`,
                        },
                        justifyContent: 'center',
                        gap: { xs: 1.5, sm: 2.5 },
                        mb: supporting.length > 0 ? { xs: 1.5, sm: 2.5 } : 0,
                    }}
                >
                    {headliners.map((row) => (
                        <TalentCard key={row.id} row={row} big />
                    ))}
                </Box>
            )}

            {supporting.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: `repeat(auto-fill, minmax(${headliners.length > 0 ? 150 : 170}px, 1fr))`,
                        },
                        gap: { xs: 1.5, sm: 2 },
                    }}
                >
                    {supporting.map((row) => (
                        <TalentCard key={row.id} row={row} big={false} />
                    ))}
                </Box>
            )}
        </Box>
    );
}
