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
} from '@mui/material';
import { format } from 'date-fns';

interface PricingSectionProps {
    convention: any;
}

// Helper function to format price
function formatPrice(amount: number | string, currency: string = 'USD'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === 0) return 'FREE';

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(numAmount);
    } catch (error) {
        // Fallback if currency is not supported
        return `${currency} ${numAmount.toFixed(2)}`;
    }
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
    // Use your original clean implementation
    const priceTiers = convention.priceTiers || [];
    const priceDiscounts = convention.priceDiscounts || [];
    const conventionTimezone = convention.timezone || convention.displayTimezone;

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

    // Sort price tiers by order
    const sortedTiers = [...priceTiers].sort((a: any, b: any) => a.order - b.order);

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom color="text.primary">
                {convention.name} Pricing Tiers
            </Typography>

            <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table>
                    <TableHead>
                        {/* First header row - spanning header only */}
                        {uniqueCutoffDates.length > 0 && (
                            <TableRow>
                                <TableCell sx={{ border: 'none' }}></TableCell>
                                <TableCell
                                    align="center"
                                    colSpan={uniqueCutoffDates.length}
                                    sx={{
                                        borderBottom: 'none',
                                        backgroundColor: '#f5f5f5',
                                        color: 'text.primary'
                                    }}
                                >
                                    <Typography variant="h6">
                                        Price good through
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ border: 'none' }}></TableCell>
                            </TableRow>
                        )}
                        {/* Second header row - all column headers */}
                        <TableRow>
                            <TableCell sx={{
                                backgroundColor: 'grey.800',
                                color: 'white',
                                py: 1
                            }}>
                                <Typography variant="h6" sx={{ color: 'white' }}>
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
                                        py: 1
                                    }}
                                >
                                    <Typography variant="h6">
                                        {formatDiscountDate(date, conventionTimezone)}
                                    </Typography>
                                </TableCell>
                            ))}
                            <TableCell
                                align="center"
                                sx={{
                                    backgroundColor: 'grey.800',
                                    color: 'white',
                                    py: 1
                                }}
                            >
                                <Typography variant="h6" sx={{ color: 'white' }}>
                                    Regular Price
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedTiers.map((tier: any) => {
                            const tierDiscounts = discountsByTier[tier.id] || [];

                            return (
                                <TableRow key={tier.id}>
                                    <TableCell>
                                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
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
                                                sx={{ backgroundColor: 'grey.100' }}
                                            >
                                                <Typography variant="body1">
                                                    {formatPrice(discountPrice)}
                                                </Typography>
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell align="center">
                                        <Typography variant="body1">
                                            {formatPrice(Number(tier.amount))}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {uniqueCutoffDates.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No active discount periods available.
                </Typography>
            )}
        </Paper>
    );
} 