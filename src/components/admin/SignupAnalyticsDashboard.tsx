'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    CircularProgress,
    Card,
    CardContent,
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
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
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

            {/* KPIs Section */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom variant="body2">
                                Signups Today
                            </Typography>
                            <Typography variant="h4" component="div">
                                {kpis.signupsToday}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom variant="body2">
                                This Month
                            </Typography>
                            <Typography variant="h4" component="div">
                                {kpis.signupsThisMonth}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom variant="body2">
                                Total {getKpiPeriodLabel(dateRange)}
                            </Typography>
                            <Typography variant="h4" component="div">
                                {kpis.totalSignups}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {/* @ts-ignore - MUI Grid 'item' prop is causing a persistent TS error */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom variant="body2">
                                Daily Average
                            </Typography>
                            <Typography variant="h4" component="div">
                                {kpis.averageDaily}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

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
            <Paper sx={{ p: 2 }}>
                {viewMode === 'chart' ? (
                    <Box>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="formattedDate"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
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
                                    stroke="#1976d2"
                                    strokeWidth={2}
                                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2 }}
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
                                            <Typography color="text.secondary">
                                                No signup data available for the selected period
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

export default SignupAnalyticsDashboard; 