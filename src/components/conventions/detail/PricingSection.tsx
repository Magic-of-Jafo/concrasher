'use client';

import React from 'react';
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
    Chip,
    Stack,
    Alert,
    Button,
    useTheme,
    useMediaQuery,
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

    // For currencies that don't have a simple symbol, Intl.NumberFormat is better
    if (['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].includes(currencyCode)) {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode,
            }).format(numAmount);
        } catch (error) {
            // Fallback for safety
            return `${currencySymbol}${numAmount.toFixed(2)}`;
        }
    }

    // Fallback for other currencies to just use the symbol
    return `${currencySymbol}${numAmount.toFixed(2)}`;
}

// Helper function to format discount cutoff date in "mmm dd" format
function formatDiscountDate(date: Date, timezone?: string): string {
    if (timezone) {
        // Convert UTC date to convention's timezone for display
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: '2-digit',
                timeZone: timezone
            });
            return formatter.format(date);
        } catch (error) {
            console.warn(`Invalid timezone: ${timezone}, falling back to UTC noon approach`);
        }
    }

    // Fallback: Extract UTC components and create date at noon UTC to avoid timezone boundary issues
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

    // Find the currency setting from the array of settings
    const currencySetting = convention.settings?.find((s: any) => s.key === 'currency');
    const currencySymbol = currencySetting?.currency?.symbol || '$';
    const currencyCode = currencySetting?.currency?.code || 'USD';


    // Debug timezone conversion
    console.log('Convention timezone:', conventionTimezone);
    if (priceDiscounts.length > 0) {
        console.log('Sample discount date (raw):', priceDiscounts[0].cutoffDate);
        console.log('Sample discount date (formatted):', formatDiscountDate(new Date(priceDiscounts[0].cutoffDate), conventionTimezone));
    }

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

    // Group discounts by price tier
    const discountsByTier = priceDiscounts.reduce((acc: any, discount: any) => {
        if (!acc[discount.priceTierId]) {
            acc[discount.priceTierId] = [];
        }
        acc[discount.priceTierId].push(discount);
        return acc;
    }, {});

    // Get all unique cutoff dates that are in the future
    const now = new Date();
    const allCutoffDates = priceDiscounts
        .map((discount: any) => new Date(discount.cutoffDate))
        .filter((date: Date) => date > now)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    // Remove duplicate dates
    const uniqueCutoffDates = allCutoffDates.filter((date: Date, index: number) =>
        index === 0 || date.getTime() !== allCutoffDates[index - 1].getTime()
    );

    // New helper function to get the current price for a tier
    const getCurrentPrice = (tier: any, tierDiscounts: any[]) => {
        const activeDiscounts = tierDiscounts.filter((d: any) => new Date(d.cutoffDate) > now);
        if (activeDiscounts.length === 0) {
            return { current: Number(tier.amount), original: Number(tier.amount) };
        }
        const lowestDiscountPrice = Math.min(...activeDiscounts.map((d: any) => Number(d.discountedAmount)));
        return { current: lowestDiscountPrice, original: Number(tier.amount) };
    };

    // Sort price tiers by order
    const sortedTiers = [...priceTiers].sort((a: any, b: any) => a.order - b.order);

    // Registration button logic from BasicInfoSection
    const hasRegistrationUrl = convention.registrationUrl &&
        convention.status === ConventionStatus.PUBLISHED;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Responsive h1 Typography styles
    const h1Styles = {
        fontSize: { xs: '2rem', md: '3rem' },
        lineHeight: { xs: 1.2, md: 1.167 },
    };

    return (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Typography variant="h1" component="h1" gutterBottom color="text.primary" sx={h1Styles}>
                {convention.name} Pricing Tiers
            </Typography>

            <TableContainer sx={{ mt: 3, borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
                <Table>
                    <TableHead>
                        {/* First header row - spanning header only */}
                        {uniqueCutoffDates.length > 0 && (
                            <TableRow>
                                <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                                <TableCell
                                    align="center"
                                    colSpan={uniqueCutoffDates.length}
                                    sx={{
                                        borderBottom: 'none',
                                        backgroundColor: '#f5f5f5',
                                        color: 'text.primary',
                                        py: 2
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Price good through
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ border: 'none', py: 2 }}></TableCell>
                            </TableRow>
                        )}
                        {/* Second header row - all column headers */}
                        <TableRow>
                            <TableCell sx={{
                                backgroundColor: 'grey.800',
                                color: 'white',
                                py: 2.5,
                                px: 3
                            }}>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                    Attendee Category
                                </Typography>
                            </TableCell>
                            {uniqueCutoffDates.map((date: Date, index: number) => (
                                <TableCell
                                    key={index}
                                    align="center"
                                    sx={{
                                        backgroundColor: 'grey.300',
                                        color: 'text.primary',
                                        py: 2.5,
                                        px: 2,
                                        minWidth: 120
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {formatDiscountDate(date, conventionTimezone)}
                                    </Typography>
                                </TableCell>
                            ))}
                            <TableCell
                                align="center"
                                sx={{
                                    backgroundColor: 'grey.800',
                                    color: 'white',
                                    py: 2.5,
                                    px: 2,
                                    minWidth: 120
                                }}
                            >
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                    {uniqueCutoffDates.length > 0 ? 'Current Price' : 'Price'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedTiers.map((tier: any, tierIndex: number) => {
                            const tierDiscounts = discountsByTier[tier.id] || [];
                            const { current, original } = getCurrentPrice(tier, tierDiscounts);
                            const hasDiscount = current < original;

                            return (
                                <TableRow
                                    key={tier.id}
                                    sx={{
                                        '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                                        '&:hover': { backgroundColor: 'action.selected' }
                                    }}
                                >
                                    <TableCell sx={{ py: 2.5, px: 3 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                                            {tier.label}
                                        </Typography>
                                    </TableCell>
                                    {uniqueCutoffDates.map((cutoffDate: Date, index: number) => {
                                        // Find discount for this cutoff date
                                        const discount = tierDiscounts.find((d: any) =>
                                            new Date(d.cutoffDate).getTime() === cutoffDate.getTime()
                                        );

                                        const discountPrice = discount ? Number(discount.discountedAmount) : Number(tier.amount);

                                        return (
                                            <TableCell
                                                key={index}
                                                align="center"
                                                sx={{
                                                    backgroundColor: 'grey.50',
                                                    py: 2.5,
                                                    px: 2
                                                }}
                                            >
                                                <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                                    {formatPrice(discountPrice, currencySymbol, currencyCode)}
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
                                                <Typography variant="body2" sx={{
                                                    textDecoration: 'line-through',
                                                    color: '#D32F2F',
                                                    fontWeight: 'medium',
                                                    fontSize: '0.875rem',
                                                    order: { xs: 1, md: 1 }
                                                }}>
                                                    {formatPrice(original, currencySymbol, currencyCode)}
                                                </Typography>
                                            )}
                                            <Typography variant="h6" sx={{
                                                fontWeight: 'bold',
                                                fontSize: '1.25rem',
                                                order: { xs: 2, md: 2 }
                                            }}>
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

            {uniqueCutoffDates.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontStyle: 'italic' }}>
                    No active discount periods available.
                </Typography>
            )}

            {/* Registration Section */}
            <Box sx={{ mt: 4, p: 3, backgroundColor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Ready to Register?
                </Typography>
                {hasRegistrationUrl ? (
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        component="a"
                        href={convention.registrationUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 1 }}
                    >
                        Click here to Register
                    </Button>
                ) : (
                    <Typography variant="body1" color="text.secondary">
                        Check back later for registration link
                    </Typography>
                )}
            </Box>
        </Box>
    );
} 