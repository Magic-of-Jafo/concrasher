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
    Button,
    ToggleButton,
    ToggleButtonGroup,
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

export default function PricingSection({ convention }: PricingSectionProps) {
    const priceTiers = convention.priceTiers || [];
    const priceDiscounts = convention.priceDiscounts || [];
    const conventionTimezone = convention.timezone || convention.displayTimezone;

    const currencySetting = convention.settings?.find((s: any) => s.key === 'currency');
    const currencySymbol = currencySetting?.currency?.symbol || '$';
    const currencyCode = currencySetting?.currency?.code || 'USD';

    // Label for the base channel (the price stored on the tier itself).
    // Falls back to the legacy online_door "door" label, then a neutral word.
    let legacyDoorLabel: string | undefined;
    const legacyLabelsSetting = convention.settings?.find((s: any) => s.key === 'pricingChannelLabels')?.value;
    if (legacyLabelsSetting) {
        try { legacyDoorLabel = JSON.parse(legacyLabelsSetting).door; } catch { /* ignore */ }
    }
    const baseChannelLabel =
        convention.settings?.find((s: any) => s.key === 'baseChannelLabel')?.value
        || legacyDoorLabel
        || 'Standard';

    // Distinct non-base channels present in the discount data (first-seen order).
    const nonBaseChannels: string[] = [];
    for (const d of priceDiscounts) {
        const ch = d.channel || '';
        if (ch && !nonBaseChannels.includes(ch)) nonBaseChannels.push(ch);
    }
    // Promoted (non-base) channels first, then the base channel last.
    const channels = [
        ...nonBaseChannels.map((c) => ({ key: c, label: c })),
        { key: '', label: baseChannelLabel },
    ];

    const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]?.key ?? '');

    const h1Styles = { fontSize: { xs: '2rem', md: '3rem' }, lineHeight: { xs: 1.2, md: 1.167 } };
    const sortedTiers = [...priceTiers].sort((a: any, b: any) => a.order - b.order);

    const hasRegistrationUrl = convention.registrationUrl &&
        convention.status === ConventionStatus.PUBLISHED;

    const registerButton = (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: { xs: 1, md: 2 } }}>
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
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom color="text.primary">
                    Pricing
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Pricing information is not yet available for this convention.
                </Typography>
            </Paper>
        );
    }

    const now = new Date();
    const activeChannel = channels.some((c) => c.key === selectedChannel) ? selectedChannel : (channels[0]?.key ?? '');

    // For the active channel, resolve each tier's "regular" price and its
    // date-based discounts. A tier with no channel-specific price falls back
    // to its base amount, so flat-priced tiers show in every channel view.
    const perTier = new Map<string, { regular: number; dated: { cutoff: Date; amount: number }[] }>();
    for (const tier of sortedTiers) {
        const entries = priceDiscounts.filter(
            (d: any) => d.priceTierId === tier.id && (d.channel || '') === activeChannel
        );
        if (activeChannel === '') {
            perTier.set(tier.id, {
                regular: Number(tier.amount),
                dated: entries.map((d: any) => ({ cutoff: new Date(d.cutoffDate), amount: Number(d.discountedAmount) })),
            });
        } else if (entries.length === 0) {
            perTier.set(tier.id, { regular: Number(tier.amount), dated: [] });
        } else {
            const sorted = [...entries].sort(
                (a: any, b: any) => new Date(a.cutoffDate).getTime() - new Date(b.cutoffDate).getTime()
            );
            const last = sorted[sorted.length - 1];
            perTier.set(tier.id, {
                regular: Number(last.discountedAmount),
                dated: sorted.slice(0, -1).map((d: any) => ({ cutoff: new Date(d.cutoffDate), amount: Number(d.discountedAmount) })),
            });
        }
    }

    // Future cutoff dates among the active channel's dated discounts.
    const allCutoffs: Date[] = [];
    perTier.forEach((info) => {
        info.dated.forEach((e) => { if (e.cutoff > now) allCutoffs.push(e.cutoff); });
    });
    allCutoffs.sort((a, b) => a.getTime() - b.getTime());
    const uniqueCutoffDates = allCutoffs.filter((d, i) => i === 0 || d.getTime() !== allCutoffs[i - 1].getTime());

    return (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Typography variant="h1" component="h1" gutterBottom color="text.primary" sx={h1Styles}>
                {convention.name} Pricing
            </Typography>

            {channels.length > 1 && (
                <ToggleButtonGroup
                    value={activeChannel}
                    exclusive
                    onChange={(_, val) => { if (val !== null) setSelectedChannel(val); }}
                    sx={{ mt: 1, mb: 1, flexWrap: 'wrap' }}
                    aria-label="Pricing channel"
                >
                    {channels.map((c) => (
                        <ToggleButton key={c.key || 'base'} value={c.key} sx={{ px: 3, fontWeight: 600 }}>
                            {c.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            )}

            <TableContainer sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
                <Table>
                    <TableHead>
                        {uniqueCutoffDates.length > 0 && (
                            <TableRow>
                                <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                                <TableCell
                                    align="center"
                                    colSpan={uniqueCutoffDates.length}
                                    sx={{ borderBottom: 'none', backgroundColor: '#f5f5f5', color: 'text.primary', py: 2 }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Price good through
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                            </TableRow>
                        )}
                        <TableRow>
                            <TableCell sx={{ backgroundColor: 'grey.800', color: 'white', py: 2.5, px: 3 }}>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                    Attendee Category
                                </Typography>
                            </TableCell>
                            {uniqueCutoffDates.map((date: Date, index: number) => (
                                <TableCell
                                    key={index}
                                    align="center"
                                    sx={{ backgroundColor: 'grey.300', color: 'text.primary', py: 2.5, px: 2, minWidth: 120 }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {formatDiscountDate(date, conventionTimezone)}
                                    </Typography>
                                </TableCell>
                            ))}
                            <TableCell
                                align="center"
                                sx={{ backgroundColor: 'grey.800', color: 'white', py: 2.5, px: 2, minWidth: 120 }}
                            >
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                    {uniqueCutoffDates.length > 0 ? 'Current Price' : 'Price'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedTiers.map((tier: any) => {
                            const info = perTier.get(tier.id)!;
                            const activeDated = info.dated.filter((e) => e.cutoff > now);
                            const current = activeDated.length
                                ? Math.min(...activeDated.map((e) => e.amount))
                                : info.regular;
                            const hasDiscount = current < info.regular;

                            return (
                                <TableRow
                                    key={tier.id}
                                    sx={{
                                        '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                                        '&:hover': { backgroundColor: 'action.selected' },
                                    }}
                                >
                                    <TableCell sx={{ py: 2.5, px: 3 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                                            {tier.label}
                                        </Typography>
                                    </TableCell>
                                    {uniqueCutoffDates.map((cutoffDate: Date, index: number) => {
                                        // Price in effect when registering by this column's date:
                                        // the tier's discount with the earliest cutoff on/after the
                                        // column date, falling back to the regular price. Tiers with
                                        // no date-based pricing in this channel show a dash.
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
                                        <Stack
                                            direction={{ xs: 'column', md: 'row' }}
                                            spacing={{ xs: 0, md: 1 }}
                                            justifyContent="center"
                                            alignItems="center"
                                        >
                                            {hasDiscount && (
                                                <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#D32F2F', fontWeight: 'medium', fontSize: '0.875rem' }}>
                                                    {formatPrice(info.regular, currencySymbol, currencyCode)}
                                                </Typography>
                                            )}
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                                                {formatPrice(current, currencySymbol, currencyCode)}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {registerButton}
        </Box>
    );
}
