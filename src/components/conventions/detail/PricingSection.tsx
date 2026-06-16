'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Chip,
    Button,
    Link as MuiLink,
    Tab,
    Tabs,
} from '@mui/material';
import { format } from 'date-fns';
import { ConventionStatus } from '@prisma/client';

interface PricingSectionProps {
    convention: any;
}

// Helper function to format price
function formatPrice(amount: number | string, currencySymbol: string = '$', currencyCode: string = 'USD'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === 0) return 'FREE';

    if (['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].includes(currencyCode)) {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode,
            }).format(numAmount);
        } catch (error) {
            return `${currencySymbol}${numAmount.toFixed(2)}`;
        }
    }

    return `${currencySymbol}${numAmount.toFixed(2)}`;
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

// Compact money for the badge — drops the ".00" on whole amounts ("Save $30").
function formatSave(amount: number, currencySymbol: string, currencyCode: string): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        }).format(amount);
    } catch {
        return `${currencySymbol}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
    }
}

// Green "Save $X" badge — the single, consistent way we signal any discount
// (a cheaper channel like Online, or an early-bird date price).
function SaveBadge({ amount, currencySymbol, currencyCode }: { amount: number; currencySymbol: string; currencyCode: string }) {
    if (!(amount > 0)) return null;
    return (
        <Chip
            size="small"
            label={`Save ${formatSave(amount, currencySymbol, currencyCode)}`}
            sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontWeight: 600, height: 22, '& .MuiChip-label': { px: 1 } }}
        />
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
            <TableContainer sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ backgroundColor: 'grey.800', color: 'white', py: 2.5, px: 3 }}>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>Attendee Category</Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ backgroundColor: 'grey.300', color: 'text.primary', py: 2.5, px: 2, minWidth: 120 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{primaryLabel}</Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ backgroundColor: 'grey.800', color: 'white', py: 2.5, px: 2, minWidth: 120 }}>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>{secondaryLabel}</Typography>
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
                                        <Typography sx={{ fontWeight: isDeal ? 'bold' : 500, fontSize: isDeal ? '1.25rem' : '1.1rem' }}>
                                            {formatPrice(val, currencySymbol, currencyCode)}
                                        </Typography>
                                        {isDeal && other !== null && <SaveBadge amount={other - val} currencySymbol={currencySymbol} currencyCode={currencyCode} />}
                                    </Stack>
                                );
                            };
                            return (
                                <TableRow key={tier.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' }, '&:hover': { backgroundColor: 'action.selected' } }}>
                                    <TableCell sx={{ py: 2.5, px: 3 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>{tier.label}</Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                                        {renderChannelCell(primary, secondary)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                                        {secondary === null ? (
                                            <Typography variant="body1" sx={{ color: 'text.disabled' }}>—</Typography>
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
        <TableContainer sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
            <Table>
                <TableHead>
                    {uniqueCutoffDates.length > 0 && (
                        <TableRow>
                            <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                            <TableCell align="center" colSpan={uniqueCutoffDates.length} sx={{ borderBottom: 'none', backgroundColor: '#f5f5f5', color: 'text.primary', py: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Price good through</Typography>
                            </TableCell>
                            <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                        </TableRow>
                    )}
                    <TableRow>
                        <TableCell sx={{ backgroundColor: 'grey.800', color: 'white', py: 2.5, px: 3 }}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>Attendee Category</Typography>
                        </TableCell>
                        {uniqueCutoffDates.map((date, index) => (
                            <TableCell key={index} align="center" sx={{ backgroundColor: 'grey.300', color: 'text.primary', py: 2.5, px: 2, minWidth: 120 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{formatDiscountDate(date, timezone)}</Typography>
                            </TableCell>
                        ))}
                        <TableCell align="center" sx={{ backgroundColor: 'grey.800', color: 'white', py: 2.5, px: 2, minWidth: 120 }}>
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>{uniqueCutoffDates.length > 0 ? 'Current Price' : 'Price'}</Typography>
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
                            <TableRow key={tier.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' }, '&:hover': { backgroundColor: 'action.selected' } }}>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>{tier.label}</Typography>
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
                                        <TableCell key={index} align="center" sx={{ backgroundColor: 'grey.50', py: 2.5, px: 2 }}>
                                            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', color: cellPrice === null ? 'text.disabled' : 'inherit' }}>
                                                {cellPrice === null ? '—' : formatPrice(cellPrice, currencySymbol, currencyCode)}
                                            </Typography>
                                        </TableCell>
                                    );
                                })}
                                <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
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

    const h1Styles = { fontSize: { xs: '2rem', md: '3rem' }, lineHeight: { xs: 1.2, md: 1.167 } };

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
                        variant="contained"
                        color="primary"
                        size="large"
                        component="a"
                        href={convention.registrationUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontWeight: 600, px: 3, py: 1.5, fontSize: '1rem', whiteSpace: 'nowrap' }}
                    >
                        Register Here
                    </Button>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
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
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h1" component="h1" gutterBottom color="text.primary" sx={h1Styles}>Tickets &amp; Pricing</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: officialPricingUrl ? 2.5 : 0 }}>
                        Each show at this festival is ticketed individually, with its own price.
                        For tickets and full pricing, visit the festival&apos;s official site.
                    </Typography>
                    {officialPricingUrl && (
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            component="a"
                            href={officialPricingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ fontWeight: 600, px: 3, py: 1.5 }}
                        >
                            Tickets &amp; pricing on the festival site
                        </Button>
                    )}
                </Paper>
            );
        }
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h1" component="h1" gutterBottom color="text.primary" sx={h1Styles}>Pricing</Typography>
                <Typography variant="body1" color="text.secondary">
                    Pricing information is not yet available for this convention.
                </Typography>
            </Paper>
        );
    }

    const now = new Date();
    const activeTabTiers = priceTiers.filter((t: any) => (t.tab || '') === activeTab);

    return (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Typography variant="h1" component="h1" gutterBottom color="text.primary" sx={h1Styles}>
                {convention.name} Pricing
            </Typography>

            {tabValues.length > 1 && (
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setSelectedTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600, fontSize: '1rem', textTransform: 'none' } }}
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
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5, mx: 'auto', maxWidth: 520, textAlign: 'center', fontStyle: 'italic' }}
            >
                {hasRegistrationUrl ? (
                    'Click above to register or to see the most current event pricing. Prices here are a guide and may change — the official event page is always the final word.'
                ) : officialPricingUrl ? (
                    <>
                        Prices here are a guide and may change. If anything differs from the{' '}
                        <MuiLink href={officialPricingUrl} target="_blank" rel="noopener noreferrer">official event page</MuiLink>,
                        the official page is correct.
                    </>
                ) : (
                    'Prices here are a guide and may change. If anything differs from the official event page, the official page is correct.'
                )}
            </Typography>
        </Box>
    );
}
