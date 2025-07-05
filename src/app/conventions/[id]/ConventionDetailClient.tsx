'use client';

import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Chip,
    Button,
    Stack,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { format } from 'date-fns';
import { ConventionStatus } from '@prisma/client';
import Link from 'next/link';
import InfoIcon from '@mui/icons-material/Info';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { getProfileImageUrl } from '@/lib/defaults';

const statusColors: Record<ConventionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
    [ConventionStatus.DRAFT]: 'default',
    [ConventionStatus.PUBLISHED]: 'primary',
    [ConventionStatus.PAST]: 'secondary',
    [ConventionStatus.CANCELLED]: 'error',
};

type ViewType = 'basic' | 'schedule' | 'pricing' | 'venue' | 'dealers' | 'media';

const navigationItems = [
    { id: 'basic' as ViewType, label: 'Basic Info', icon: InfoIcon },
    { id: 'schedule' as ViewType, label: 'Schedule', icon: ScheduleIcon },
    { id: 'pricing' as ViewType, label: 'Pricing', icon: AttachMoneyIcon },
    { id: 'venue' as ViewType, label: 'Venue/Hotel', icon: LocationOnIcon },
    { id: 'dealers' as ViewType, label: 'Dealers', icon: StorefrontIcon },
    { id: 'media' as ViewType, label: 'Media', icon: PhotoLibraryIcon },
];

interface ConventionDetailClientProps {
    convention: any;
}

// Helper function to format price
function formatPrice(amount: number): string {
    if (amount === 0) return 'FREE';
    return `$${amount.toFixed(2)}`;
}

// Helper function to format cutoff date
function formatCutoffDate(date: Date): string {
    // Extract the UTC date components and format them directly
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-based (6 = July)
    const day = date.getUTCDate(); // 1-based (9 = 9th)

    // Create a date object in local timezone using the UTC date values
    // This ensures we display July 9, not July 8
    const displayDate = new Date(year, month, day);

    return `thru ${format(displayDate, 'MMMM d')}`;
}

function PricingView({ convention }: { convention: any }) {
    // We'll need to fetch pricing data - for now using placeholder
    // In a real implementation, you'd fetch this data in the server component
    const priceTiers = convention.priceTiers || [];
    const priceDiscounts = convention.priceDiscounts || [];

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
                        <TableRow>
                            <TableCell>
                                <Typography variant="h6">
                                    Registration Type
                                </Typography>
                            </TableCell>
                            {uniqueCutoffDates.map((date: Date, index: number) => (
                                <TableCell key={index} align="center">
                                    <Typography variant="h6">
                                        {formatCutoffDate(date)}
                                    </Typography>
                                </TableCell>
                            ))}
                            <TableCell align="center">
                                <Typography variant="h6">
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
                                            <TableCell key={index} align="center">
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

function BasicInfoView({ convention }: { convention: any }) {
    // Determine registration message and button based on registrationUrl
    let registrationMessage = 'Check back later for registration link';
    let showRegisterButton = false;
    let registrationButtonText = 'Click here to register';

    if ((convention as any).registrationUrl) {
        // If there's a registration URL, show the button
        showRegisterButton = true;
        registrationMessage = ''; // Clear the message when we have a button
    }

    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ position: 'relative', height: 300, mb: 3 }}>
                    <Box
                        component="img"
                        src={convention.coverImageUrl || '/images/default-convention.jpg'}
                        alt={convention.name}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 1,
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Box sx={{ flex: 2 }}>
                        <Typography variant="h4" component="h1" gutterBottom color="text.primary">
                            {convention.name}
                        </Typography>

                        {/* Only show status badge if NOT published */}
                        {convention.status !== ConventionStatus.PUBLISHED && (
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                <Chip
                                    label={convention.status}
                                    color={statusColors[convention.status as ConventionStatus]}
                                />
                            </Stack>
                        )}

                        <Box
                            sx={{
                                '& p': { mb: 2 },
                                '& ul, & ol': { mb: 2, pl: 3 },
                                '& li': { mb: 1 },
                                '& h1, & h2, & h3, & h4, & h5, & h6': { mb: 2, mt: 3 },
                                '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
                                '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
                                '& blockquote': {
                                    borderLeft: '4px solid',
                                    borderColor: 'divider',
                                    pl: 2,
                                    py: 1,
                                    my: 2,
                                    fontStyle: 'italic'
                                }
                            }}
                            dangerouslySetInnerHTML={{ __html: convention.descriptionMain || convention.descriptionShort || 'No description available.' }}
                        />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        {/* Profile Image Section */}
                        <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
                            <Box
                                component="img"
                                src={getProfileImageUrl(convention.profileImageUrl)}
                                alt={`${convention.name} profile`}
                                sx={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: 300,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    mb: 2,
                                }}
                            />
                        </Paper>

                        {/* Event Details - moved from bottom */}
                        <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
                            <Typography variant="h6" gutterBottom color="text.primary">
                                Event Details
                            </Typography>

                            {/* Date Information */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                    Date
                                </Typography>
                                <Typography variant="body1" color="text.primary" sx={{ fontWeight: 'medium' }}>
                                    {(() => {
                                        if (convention.isTBD || !convention.startDate) {
                                            return 'To Be Determined';
                                        }
                                        const startDateObj = new Date(convention.startDate);
                                        const formattedStartDate = format(startDateObj, 'MMMM d, yyyy');

                                        if (convention.isOneDayEvent) {
                                            return formattedStartDate;
                                        }

                                        if (convention.endDate) {
                                            const endDateObj = new Date(convention.endDate);
                                            if (
                                                startDateObj.getFullYear() === endDateObj.getFullYear() &&
                                                startDateObj.getMonth() === endDateObj.getMonth() &&
                                                startDateObj.getDate() === endDateObj.getDate()
                                            ) {
                                                return formattedStartDate;
                                            } else {
                                                const formattedEndDate = format(endDateObj, 'MMMM d, yyyy');
                                                return `${formattedStartDate} - ${formattedEndDate}`;
                                            }
                                        }
                                        return formattedStartDate;
                                    })()}
                                </Typography>
                            </Box>

                            {/* Location Information */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                    Location
                                </Typography>
                                <Typography variant="body1" color="text.primary">
                                    {convention.venueName}
                                    <br />
                                    {convention.city}
                                    {convention.stateAbbreviation && `, ${convention.stateAbbreviation}`}
                                    {convention.stateName && ` (${convention.stateName})`}
                                    <br />
                                    {convention.country}
                                </Typography>
                            </Box>

                            {/* Website Information */}
                            {convention.websiteUrl && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                        Website
                                    </Typography>
                                    <Typography variant="body1" color="text.primary">
                                        <Link href={convention.websiteUrl} target="_blank" rel="noopener noreferrer">
                                            {convention.websiteUrl}
                                        </Link>
                                    </Typography>
                                </Box>
                            )}
                        </Paper>

                        {/* Registration Section */}
                        <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
                            <Typography variant="h6" gutterBottom color="text.primary">
                                Registration
                            </Typography>

                            {showRegisterButton ? (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    component={Link}
                                    href={(convention as any).registrationUrl!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {registrationButtonText}
                                </Button>
                            ) : (
                                <Typography variant="body1" color="text.primary">
                                    {registrationMessage}
                                </Typography>
                            )}
                        </Paper>
                    </Box>
                </Box>
            </Paper>
        </>
    );
}

function PlaceholderView({ title }: { title: string }) {
    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom color="text.primary">
                {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                This section is coming soon. Content for {title.toLowerCase()} will be displayed here.
            </Typography>
        </Paper>
    );
}

export default function ConventionDetailClient({ convention }: ConventionDetailClientProps) {
    const [currentView, setCurrentView] = useState<ViewType>('basic');

    const renderCurrentView = () => {
        switch (currentView) {
            case 'basic':
                return <BasicInfoView convention={convention} />;
            case 'schedule':
                return <PlaceholderView title="Schedule" />;
            case 'pricing':
                return <PricingView convention={convention} />;
            case 'venue':
                return <PlaceholderView title="Venue/Hotel" />;
            case 'dealers':
                return <PlaceholderView title="Dealers" />;
            case 'media':
                return <PlaceholderView title="Media" />;
            default:
                return <BasicInfoView convention={convention} />;
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
                {/* Left Sidebar Navigation */}
                <Paper
                    sx={{
                        width: 250,
                        height: 'fit-content',
                        position: 'sticky',
                        top: 20,
                        flexShrink: 0,
                    }}
                >
                    <List sx={{ p: 0 }}>
                        {navigationItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <ListItem key={item.id} disablePadding>
                                    <ListItemButton
                                        selected={currentView === item.id}
                                        onClick={() => setCurrentView(item.id)}
                                        sx={{
                                            '&.Mui-selected': {
                                                backgroundColor: 'primary.main',
                                                color: 'primary.contrastText',
                                                '&:hover': {
                                                    backgroundColor: 'primary.dark',
                                                },
                                                '& .MuiListItemIcon-root': {
                                                    color: 'primary.contrastText',
                                                },
                                            },
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconComponent />
                                        </ListItemIcon>
                                        <ListItemText primary={item.label} />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </Paper>

                {/* Main Content Area */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {renderCurrentView()}
                </Box>
            </Box>
        </Container>
    );
} 