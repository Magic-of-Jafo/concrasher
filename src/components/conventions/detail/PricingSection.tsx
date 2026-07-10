'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Button,
    Link as MuiLink,
    Tab,
    Tabs,
} from '@mui/material';
import { format } from 'date-fns';
import { ConventionStatus } from '@prisma/client';
import { DISPLAY, BODY } from '@/lib/fonts';
import { SectionKicker } from './VenueSection';

interface PricingSectionProps {
    convention: any;
}

// Site-wide money formatting: thousands separators, and the fractional part
// shown only when it exists ($5 → $5, $5.12 → $5.12, ₩280000 → ₩280,000).
function formatMoney(numAmount: number, currencySymbol: string): string {
    const grouped = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: Number.isInteger(numAmount) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(numAmount);
    return `${currencySymbol}${grouped}`;
}

// Helper function to format price
function formatPrice(amount: number | string, currencySymbol: string = '$', currencyCode: string = 'USD'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!Number.isFinite(numAmount)) return '';
    if (numAmount === 0) return 'FREE';
    return formatMoney(numAmount, currencySymbol);
}

// Helper function to format discount cutoff date in "mmm dd" format
function formatDiscountDate(date: Date, timezone?: string): string {
    if (timezone) {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: '2-digit',
                timeZone: timezone,
            });
            return formatter.format(date);
        } catch (error) {
            console.warn(`Invalid timezone: ${timezone}, falling back to UTC noon approach`);
        }
    }

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const displayDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    return format(displayDate, 'MMM dd');
}

// Compact money for the badge — same rules as the tables ("Save $30", "Save ₩30,000").
function formatSave(amount: number, currencySymbol: string, _currencyCode: string): string {
    return formatMoney(amount, currencySymbol);
}

// Green "Save $X" badge — the single, consistent way we signal any discount
// (a cheaper channel like Online, or an early-bird date price).
function SaveBadge({ amount, currencySymbol, currencyCode }: { amount: number; currencySymbol: string; currencyCode: string }) {
    if (!(amount > 0)) return null;
    return (
        <Box
            component="span"
            sx={{
                fontFamily: BODY, fontSize: '0.72rem', fontWeight: 700,
                color: 'var(--cc-live)', border: '1px solid var(--cc-live)',
                borderRadius: '8px', px: 0.75, py: 0.25, whiteSpace: 'nowrap',
            }}
        >
            {`Save ${formatSave(amount, currencySymbol, currencyCode)}`}
        </Box>
    );
}

interface TabTableProps {
    tiers: any[];
    discounts: any[];
    currencySymbol: string;
    currencyCode: string;
    timezone?: string;
    primaryLabel: string;
    secondaryLabel: string;
    now: Date;
}

// Renders a single pricing table (one tab). A tab is either:
//  - two-channel: rows carry a primary (amount) and secondary (amountSecondary)
//    price, shown as two columns with the dearer one struck through, or
//  - single-channel: one price column plus optional early-bird date columns
//    driven by the tiers' date discounts.
function TabPricingTable({ tiers, discounts, currencySymbol, currencyCode, timezone, primaryLabel, secondaryLabel, now }: TabTableProps) {
    const sortedTiers = [...tiers].sort((a, b) => a.order - b.order);
    const isTwoChannel = sortedTiers.some((t) => t.amountSecondary !== null && t.amountSecondary !== undefined);

    if (isTwoChannel) {
        return (
            <TableContainer sx={{ mt: 2, borderRadius: '12px', overflow: 'auto', border: '1px solid var(--cc-panel-border)' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ backgroundColor: 'var(--cc-panel)', borderBottom: '1px solid var(--cc-panel-border)', py: 2.5, px: 3 }}>
                                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-ink)' }}>Attendee Category</Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ backgroundColor: 'var(--cc-panel)', borderBottom: '1px solid var(--cc-panel-border)', py: 2.5, px: 2, minWidth: 120 }}>
                                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-muted)' }}>{primaryLabel}</Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ backgroundColor: 'var(--cc-panel)', borderBottom: '1px solid var(--cc-panel-border)', py: 2.5, px: 2, minWidth: 120 }}>
                                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-ink)' }}>{secondaryLabel}</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedTiers.map((tier) => {
                            const primary = Number(tier.amount);
                            const hasSecondary = tier.amountSecondary !== null && tier.amountSecondary !== undefined;
                            const secondary = hasSecondary ? Number(tier.amountSecondary) : null;
                            // Each column shows its own price; the cheaper one carries a green
                            // "Save $X" badge so the saving is explicit (no struck-out column).
                            const renderChannelCell = (val: number, other: number | null) => {
                                const isDeal = other !== null && val < other;
                                return (
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                        <Typography sx={{ fontFamily: DISPLAY, fontWeight: isDeal ? 800 : 600, fontSize: isDeal ? '1.25rem' : '1.1rem', color: 'var(--cc-ink)' }}>
                                            {formatPrice(val, currencySymbol, currencyCode)}
                                        </Typography>
                                        {isDeal && other !== null && <SaveBadge amount={other - val} currencySymbol={currencySymbol} currencyCode={currencyCode} />}
                                    </Stack>
                                );
                            };
                            return (
                                <TableRow key={tier.id} sx={{ '& td': { borderBottom: '1px solid var(--cc-hairline)' }, '&:hover': { backgroundColor: 'var(--cc-panel)' } }}>
                                    <TableCell sx={{ py: 2.5, px: 3 }}>
                                        <Typography sx={{ fontFamily: BODY, fontWeight: 600, fontSize: '1rem', color: 'var(--cc-ink)' }}>{tier.label}</Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                                        {renderChannelCell(primary, secondary)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                                        {secondary === null ? (
                                            <Typography sx={{ color: 'var(--cc-soft)' }}>–</Typography>
                                        ) : (
                                            renderChannelCell(secondary, primary)
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // Single-channel: regular price (tier.amount) + optional early-bird date columns.
    const perTier = new Map<string, { regular: number; dated: { cutoff: Date; amount: number }[] }>();
    for (const tier of sortedTiers) {
        const entries = discounts
            .filter((d: any) => d.priceTierId === tier.id)
            .map((d: any) => ({ cutoff: new Date(d.cutoffDate), amount: Number(d.discountedAmount) }));
        perTier.set(tier.id, { regular: Number(tier.amount), dated: entries });
    }

    const allCutoffs: Date[] = [];
    perTier.forEach((info) => {
        info.dated.forEach((e) => { if (e.cutoff > now) allCutoffs.push(e.cutoff); });
    });
    allCutoffs.sort((a, b) => a.getTime() - b.getTime());
    const uniqueCutoffDates = allCutoffs.filter((d, i) => i === 0 || d.getTime() !== allCutoffs[i - 1].getTime());

    return (
        <TableContainer sx={{ mt: 2, borderRadius: '12px', overflow: 'auto', border: '1px solid var(--cc-panel-border)' }}>
            <Table>
                <TableHead>
                    {uniqueCutoffDates.length > 0 && (
                        <TableRow>
                            <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                            <TableCell align="center" colSpan={uniqueCutoffDates.length} sx={{ borderBottom: 'none', backgroundColor: 'var(--cc-panel)', py: 2 }}>
                                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-muted)' }}>Price good through</Typography>
                            </TableCell>
                            <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                        </TableRow>
                    )}
                    <TableRow>
                        <TableCell sx={{ backgroundColor: 'var(--cc-panel)', borderBottom: '1px solid var(--cc-panel-border)', py: 2.5, px: 3 }}>
                            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-ink)' }}>Attendee Category</Typography>
                        </TableCell>
                        {uniqueCutoffDates.map((date, index) => (
                            <TableCell key={index} align="center" sx={{ backgroundColor: 'var(--cc-panel)', borderBottom: '1px solid var(--cc-panel-border)', py: 2.5, px: 2, minWidth: 120 }}>
                                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-muted)' }}>{formatDiscountDate(date, timezone)}</Typography>
                            </TableCell>
                        ))}
                        <TableCell align="center" sx={{ backgroundColor: 'var(--cc-panel)', borderBottom: '1px solid var(--cc-panel-border)', py: 2.5, px: 2, minWidth: 120 }}>
                            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cc-ink)' }}>{uniqueCutoffDates.length > 0 ? 'Current Price' : 'Price'}</Typography>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedTiers.map((tier) => {
                        const info = perTier.get(tier.id)!;
                        const activeDated = info.dated.filter((e) => e.cutoff > now);
                        const current = activeDated.length ? Math.min(...activeDated.map((e) => e.amount)) : info.regular;
                        const fullPrice = info.regular;
                        const hasDiscount = current < fullPrice;
                        return (
                            <TableRow key={tier.id} sx={{ '& td': { borderBottom: '1px solid var(--cc-hairline)' }, '&:hover': { backgroundColor: 'var(--cc-panel)' } }}>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Typography sx={{ fontFamily: BODY, fontWeight: 600, fontSize: '1rem', color: 'var(--cc-ink)' }}>{tier.label}</Typography>
                                </TableCell>
                                {uniqueCutoffDates.map((cutoffDate, index) => {
                                    let cellPrice: number | null = null;
                                    if (info.dated.length > 0) {
                                        const applicable = info.dated
                                            .filter((e) => e.cutoff.getTime() >= cutoffDate.getTime())
                                            .sort((a, b) => a.cutoff.getTime() - b.cutoff.getTime())[0];
                                        cellPrice = applicable ? applicable.amount : info.regular;
                                    }
                                    return (
                                        <TableCell key={index} align="center" sx={{ py: 2.5, px: 2 }}>
                                            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: '1.1rem', color: cellPrice === null ? 'var(--cc-soft)' : 'var(--cc-muted)' }}>
                                                {cellPrice === null ? '–' : formatPrice(cellPrice, currencySymbol, currencyCode)}
                                            </Typography>
                                        </TableCell>
                                    );
                                })}
                                <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                        <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '1.25rem', color: 'var(--cc-ink)' }}>
                                            {formatPrice(current, currencySymbol, currencyCode)}
                                        </Typography>
                                        {hasDiscount && <SaveBadge amount={fullPrice - current} currencySymbol={currencySymbol} currencyCode={currencyCode} />}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default function PricingSection({ convention }: PricingSectionProps) {
    const priceTiers = convention.priceTiers || [];
    const priceDiscounts = convention.priceDiscounts || [];
    const conventionTimezone = convention.timezone || convention.displayTimezone;

    const currencySetting = convention.settings?.find((s: any) => s.key === 'currency');
    const currencySymbol = currencySetting?.currency?.symbol || '$';
    const currencyCode = currencySetting?.currency?.code || 'USD';

    // Primary/secondary column labels for two-channel tables (e.g. At the Door / Online).
    let legacyDoorLabel: string | undefined;
    const legacyLabelsSetting = convention.settings?.find((s: any) => s.key === 'pricingChannelLabels')?.value;
    if (legacyLabelsSetting) {
        try { legacyDoorLabel = JSON.parse(legacyLabelsSetting).door; } catch { /* ignore */ }
    }
    const baseChannelLabel =
        convention.settings?.find((s: any) => s.key === 'baseChannelLabel')?.value
        || legacyDoorLabel
        || 'Standard';
    const secondaryChannelLabel =
        convention.settings?.find((s: any) => s.key === 'secondaryChannelLabel')?.value || 'Online';

    // Group tiers into tabs (independent tables). Empty tab = the single/base table.
    const tabValues: string[] = [];
    for (const tier of priceTiers) {
        const t = tier.tab || '';
        if (!tabValues.includes(t)) tabValues.push(t);
    }
    const tabLabel = (t: string) => (t === '' ? baseChannelLabel : t);

    // Optional explicit tab order (JSON array of tab labels, e.g. ["Weekly","Daily"]).
    const channelOrderRaw = convention.settings?.find((s: any) => s.key === 'channelOrder')?.value;
    if (channelOrderRaw) {
        try {
            const order: string[] = JSON.parse(channelOrderRaw);
            const rank = (t: string) => {
                const i = order.indexOf(tabLabel(t));
                return i === -1 ? Number.MAX_SAFE_INTEGER : i;
            };
            tabValues.sort((a, b) => rank(a) - rank(b));
        } catch { /* malformed — keep first-seen order */ }
    }

    const [selectedTab, setSelectedTab] = useState<string>(tabValues[0] ?? '');
    const activeTab = tabValues.includes(selectedTab) ? selectedTab : (tabValues[0] ?? '');

    const hasRegistrationUrl = convention.registrationUrl && convention.status === ConventionStatus.PUBLISHED;
    const officialPricingUrl = convention.registrationUrl || convention.websiteUrl || null;

    const registerButton = (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Box sx={{ minWidth: { xs: 'auto', md: 120 }, display: 'flex', justifyContent: 'center' }}>
                {hasRegistrationUrl ? (
                    <Button
                        component="a"
                        href={convention.registrationUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            fontFamily: DISPLAY, fontWeight: 800, fontSize: '0.95rem', textTransform: 'none',
                            backgroundColor: 'var(--cc-gold)', color: 'var(--cc-gold-ink)',
                            px: 3.25, py: 1.5, minHeight: 48, borderRadius: '8px', whiteSpace: 'nowrap',
                            boxShadow: 'var(--cc-glow-gold)',
                            '&:hover': { backgroundColor: 'var(--cc-gold)', filter: 'brightness(1.06)' },
                            '&:focus-visible': { outline: '3px solid var(--cc-cyan)', outlineOffset: '3px' },
                        }}
                    >
                        Register Here ↗
                    </Button>
                ) : (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center', fontFamily: BODY, color: 'var(--cc-soft)' }}>
                        Check back later for registration link
                    </Typography>
                )}
            </Box>
        </Box>
    );

    if (priceTiers.length === 0) {
        // Festivals price each show individually, so there's no single table —
        // point ticket-buyers to the festival's own site instead.
        if (convention.type === 'FESTIVAL') {
            return (
                <Box sx={{ py: 1 }}>
                    <SectionKicker>Tickets &amp; Pricing</SectionKicker>
                    <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)', mb: officialPricingUrl ? 2.5 : 0 }}>
                        Each show at this festival is ticketed individually, with its own price.
                        For tickets and full pricing, visit the festival&apos;s official site.
                    </Typography>
                    {officialPricingUrl && (
                        <Button
                            component="a"
                            href={officialPricingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                fontFamily: DISPLAY, fontWeight: 700, textTransform: 'none',
                                color: 'var(--cc-ink)', border: '1px solid var(--cc-panel-border)',
                                borderRadius: '8px', px: 2, minHeight: 44,
                                '&:hover': { borderColor: 'var(--cc-cyan)', backgroundColor: 'var(--cc-panel)' },
                            }}
                        >
                            Tickets &amp; pricing on the festival site ↗
                        </Button>
                    )}
                </Box>
            );
        }
        return (
            <Box sx={{ py: 1 }}>
                <SectionKicker>Pricing</SectionKicker>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.95rem', color: 'var(--cc-muted)' }}>
                    Pricing information is not yet available for this convention.
                </Typography>
            </Box>
        );
    }

    const now = new Date();
    const activeTabTiers = priceTiers.filter((t: any) => (t.tab || '') === activeTab);

    return (
        <Box sx={{ py: 1 }}>
            <SectionKicker>Pricing</SectionKicker>

            {tabValues.length > 1 && (
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setSelectedTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        mb: 2, borderBottom: '1px solid var(--cc-hairline)',
                        '& .MuiTabs-indicator': { backgroundColor: 'var(--cc-gold)' },
                        '& .MuiTab-root': { fontFamily: DISPLAY, fontWeight: 700, fontSize: '0.95rem', textTransform: 'none', color: 'var(--cc-muted)' },
                        '& .MuiTab-root.Mui-selected': { color: 'var(--cc-ink)' },
                    }}
                    aria-label="Pricing tabs"
                >
                    {tabValues.map((t) => (
                        <Tab key={t || 'base'} value={t} label={tabLabel(t)} />
                    ))}
                </Tabs>
            )}

            <TabPricingTable
                tiers={activeTabTiers}
                discounts={priceDiscounts}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                timezone={conventionTimezone}
                primaryLabel={baseChannelLabel}
                secondaryLabel={secondaryChannelLabel}
                now={now}
            />

            {registerButton}

            <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1.5, mx: 'auto', maxWidth: 520, textAlign: 'center', fontStyle: 'italic', fontFamily: BODY, color: 'var(--cc-soft)' }}
            >
                {hasRegistrationUrl ? (
                    'Click above to register or to see the most current event pricing. Prices here are a guide and may change; the official event page is always the final word.'
                ) : officialPricingUrl ? (
                    <>
                        Prices here are a guide and may change. If anything differs from the{' '}
                        <MuiLink href={officialPricingUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'var(--cc-cyan)' }}>official event page</MuiLink>,
                        the official page is correct.
                    </>
                ) : (
                    'Prices here are a guide and may change. If anything differs from the official event page, the official page is correct.'
                )}
            </Typography>
        </Box>
    );
}
