'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, TableChart } from '@mui/icons-material';

interface SignupData {
    date: string;
    count: number;
}

type DateRange = 'last7days' | 'last30days' | 'monthToDate' | 'lastMonth';

const SignupAnalyticsDashboard: React.FC = () => {
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const [dateRange, setDateRange] = useState<DateRange>('last7days');

    // Recharts renders SVG attributes, which can't read CSS variables, so pull the
    // House Lights tokens at runtime and re-read them when the theme is toggled.
    const [chartColors, setChartColors] = useState({
        line: '#a8b3c4', grid: 'rgba(148,137,121,0.15)', text: '#8a8d94',
        tipBg: '#222831', tipInk: '#dfd0b8', tipBorder: 'rgba(148,137,121,0.5)',
    });
    useEffect(() => {
        const read = () => {
            const cs = getComputedStyle(document.documentElement);
            const v = (n: string, f: string) => (cs.getPropertyValue(n).trim() || f);
            setChartColors({
                line: v('--cc-cyan', '#a8b3c4'),
                grid: v('--cc-hairline', 'rgba(148,137,121,0.15)'),
                text: v('--cc-soft', '#8a8d94'),
                tipBg: v('--cc-bg', '#222831'),
                tipInk: v('--cc-ink', '#dfd0b8'),
                tipBorder: v('--cc-panel-border', 'rgba(148,137,121,0.5)'),
            });
        };
        read();
        const obs = new MutationObserver(read);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // Calculate date range based on selection
    const getDateRange = (range: DateRange) => {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        switch (range) {
            case 'last7days':
                const sevenDaysAgo = new Date(startOfToday);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return {
                    startDate: sevenDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };

            case 'last30days':
                const thirtyDaysAgo = new Date(startOfToday);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return {
                    startDate: thirtyDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };

            case 'monthToDate':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    startDate: startOfMonth.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };

            case 'lastMonth':
                const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                return {
                    startDate: startOfLastMonth.toISOString().split('T')[0],
                    endDate: endOfLastMonth.toISOString().split('T')[0]
                };

            default:
                return {
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
        }
    };

    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch signup data
    const { data: signupData, isLoading, error } = useQuery<SignupData[]>({
        queryKey: ['signup-analytics', dateRange, startDate, endDate],
        queryFn: async () => {
            const url = new URL('/api/admin/analytics/signups', window.location.origin);
            url.searchParams.set('startDate', startDate);
            url.searchParams.set('endDate', endDate);

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error('Failed to fetch signup data');
            }
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true, // Refetch when the window regains focus
        refetchOnMount: true, // Refetch when the component mounts
        refetchOnReconnect: true, // Refetch when the browser reconnects to the network
    });

    // Calculate KPIs
    const kpis = useMemo(() => {
        if (!signupData || signupData.length === 0) {
            return {
                signupsToday: 0,
                signupsThisMonth: 0,
                totalSignups: 0,
                averageDaily: 0
            };
        }

        const today = new Date();
        const todayFormatted = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        const signupsToday = signupData.find(item => item.date === todayFormatted)?.count || 0;
        const signupsThisMonth = signupData
            .filter(item => {
                // Extract year and month from formatted date like "Jul 25, 2025"
                const dateParts = item.date.split(', ');
                if (dateParts.length === 2) {
                    const year = parseInt(dateParts[1]);
                    const monthPart = dateParts[0].split(' ')[0];
                    const month = new Date(Date.parse(`${monthPart} 1, ${year}`)).getMonth();
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();
                    return month === currentMonth && year === currentYear;
                }
                return false;
            })
            .reduce((sum, item) => sum + item.count, 0);
        const totalSignups = signupData.reduce((sum, item) => sum + item.count, 0);
        const averageDaily = signupData.length > 0 ? Math.round(totalSignups / signupData.length) : 0;

        return {
            signupsToday,
            signupsThisMonth,
            totalSignups,
            averageDaily
        };
    }, [signupData]);

    // Format data for chart
    const chartData = useMemo(() => {
        if (!signupData) return [];

        return signupData.map(item => {
            // Handle both date formats: "2025-07-23" and "2025-07-23T03:08:32.544Z"
            const dateStr = item.date.includes('T') ? item.date.split('T')[0] : item.date;
            const date = new Date(dateStr + 'T00:00:00');

            return {
                ...item,
                date: dateStr, // Ensure consistent date format
                formattedDate: date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                })
            };
        });
    }, [signupData]);

    // Get display text for date ranges
    const getDateRangeLabel = (range: DateRange) => {
        switch (range) {
            case 'last7days': return 'Last 7 Days';
            case 'last30days': return 'Last 30 Days';
            case 'monthToDate': return 'Month to Date';
            case 'lastMonth': return 'Last Month';
            default: return 'Last 7 Days';
        }
    };

    const getKpiPeriodLabel = (range: DateRange) => {
        switch (range) {
            case 'last7days': return '(7 days)';
            case 'last30days': return '(30 days)';
            case 'monthToDate': return '(month to date)';
            case 'lastMonth': return '(last month)';
            default: return '(7 days)';
        }
    };

    const handleViewModeChange = (
        event: React.MouseEvent<HTMLElement>,
        newViewMode: 'chart' | 'table'
    ) => {
        if (newViewMode !== null) {
            setViewMode(newViewMode);
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                    Loading signup analytics...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Failed to load signup analytics: {error instanceof Error ? error.message : 'Unknown error'}
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                User Signup Analytics
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 3, color: 'var(--cc-muted)' }}>
                Monitor user registration trends for the selected period
            </Typography>

            {/* Date Range Selector */}
            <Box sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="date-range-label">Date Range</InputLabel>
                    <Select
                        labelId="date-range-label"
                        value={dateRange}
                        label="Date Range"
                        onChange={(e) => setDateRange(e.target.value as DateRange)}
                    >
                        <MenuItem value="last7days">Last 7 Days</MenuItem>
                        <MenuItem value="last30days">Last 30 Days</MenuItem>
                        <MenuItem value="monthToDate">Month to Date</MenuItem>
                        <MenuItem value="lastMonth">Last Month</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* KPIs Section — themed panels, 2-up on phones, 4-up on desktop. */}
            <Box
                sx={{
                    mb: 3,
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                }}
            >
                {[
                    { label: 'Signups Today', value: kpis.signupsToday },
                    { label: 'This Month', value: kpis.signupsThisMonth },
                    { label: `Total ${getKpiPeriodLabel(dateRange)}`, value: kpis.totalSignups },
                    { label: 'Daily Average', value: kpis.averageDaily },
                ].map((kpi) => (
                    <Box
                        key={kpi.label}
                        sx={{
                            backgroundColor: 'var(--cc-panel)',
                            border: '1px solid var(--cc-panel-border)',
                            borderRadius: '12px',
                            p: 2,
                        }}
                    >
                        <Typography gutterBottom variant="body2" sx={{ color: 'var(--cc-muted)' }}>
                            {kpi.label}
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ color: 'var(--cc-ink)', fontWeight: 800 }}>
                            {kpi.value}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Toggle Section */}
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Signup Trends</Typography>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    aria-label="view mode"
                    size="small"
                >
                    <ToggleButton value="chart" aria-label="chart view">
                        <BarChart sx={{ mr: 1 }} />
                        Chart
                    </ToggleButton>
                    <ToggleButton value="table" aria-label="table view">
                        <TableChart sx={{ mr: 1 }} />
                        Table
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Chart/Table Content */}
            <Box sx={{ p: 2, backgroundColor: 'var(--cc-panel)', border: '1px solid var(--cc-panel-border)', borderRadius: '12px' }}>
                {viewMode === 'chart' ? (
                    <Box>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                <XAxis
                                    dataKey="formattedDate"
                                    tick={{ fontSize: 12, fill: chartColors.text }}
                                    stroke={chartColors.grid}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: chartColors.text }}
                                    stroke={chartColors.grid}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: chartColors.tipBg,
                                        border: `1px solid ${chartColors.tipBorder}`,
                                        borderRadius: 8,
                                        color: chartColors.tipInk,
                                    }}
                                    labelStyle={{ color: chartColors.tipInk }}
                                    itemStyle={{ color: chartColors.tipInk }}
                                    cursor={{ stroke: chartColors.line, strokeOpacity: 0.3 }}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload[0]) {
                                            const originalDate = payload[0].payload.date;
                                            const dateStr = originalDate.includes('T') ? originalDate.split('T')[0] : originalDate;
                                            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            });
                                        }
                                        return label;
                                    }}
                                    formatter={(value: number) => [value, 'New Signups']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke={chartColors.line}
                                    strokeWidth={2}
                                    dot={{ fill: chartColors.line, strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: chartColors.line, strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Date</strong></TableCell>
                                    <TableCell align="right"><strong>New Signups</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {chartData.map((row) => (
                                    <TableRow key={row.date}>
                                        <TableCell>
                                            {row.date}
                                        </TableCell>
                                        <TableCell align="right">{row.count}</TableCell>
                                    </TableRow>
                                ))}
                                {chartData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center">
                                            <Typography sx={{ color: 'var(--cc-muted)' }}>
                                                No signup data available for the selected period
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};

export default SignupAnalyticsDashboard; 