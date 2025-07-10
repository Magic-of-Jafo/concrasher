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
import HotelIcon from '@mui/icons-material/Hotel';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { getProfileImageUrl } from '@/lib/defaults';
import BasicInfoSection from '@/components/conventions/detail/BasicInfoSection';
import PricingSection from '@/components/conventions/detail/PricingSection';
import VenueSection from '@/components/conventions/detail/VenueSection';
import HotelSection from '@/components/conventions/detail/HotelSection';
import ScheduleSection from '@/components/conventions/detail/ScheduleSection';
import DealersSection from '@/components/conventions/detail/DealersSection';
import MediaGallerySection from '@/components/conventions/detail/MediaGallerySection';

const statusColors: Record<ConventionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info'> = {
    [ConventionStatus.DRAFT]: 'default',
    [ConventionStatus.PUBLISHED]: 'primary',
    [ConventionStatus.PAST]: 'secondary',
    [ConventionStatus.CANCELLED]: 'error',
};

type ViewType = 'basic' | 'schedule' | 'pricing' | 'venue' | 'hotel' | 'dealers' | 'media';

const navigationItems = [
    { id: 'basic' as ViewType, label: 'Basic Info', icon: InfoIcon },
    { id: 'schedule' as ViewType, label: 'Schedule', icon: ScheduleIcon },
    { id: 'pricing' as ViewType, label: 'Pricing', icon: AttachMoneyIcon },
    { id: 'venue' as ViewType, label: 'Venue', icon: LocationOnIcon },
    { id: 'hotel' as ViewType, label: 'Hotel', icon: HotelIcon },
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
    const month = date.getUTCMonth(); // 0-based (6 = July)
    const day = date.getUTCDate(); // 1-based (9 = 9th)
    const displayDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));

    return format(displayDate, 'MMM dd');
}

function PricingView({ convention }: { convention: any }) {
    // We'll need to fetch pricing data - for now using placeholder
    // In a real implementation, you'd fetch this data in the server component
    const priceTiers = convention.priceTiers || [];
    const priceDiscounts = convention.priceDiscounts || [];
    const conventionTimezone = convention.timezone?.ianaId || convention.settings?.timezone;

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
                return <BasicInfoSection convention={convention} />;
            case 'pricing':
                return <PricingSection convention={convention} />;
            case 'venue':
                return <VenueSection convention={convention} />;
            case 'hotel':
                return <HotelSection convention={convention} />;
            case 'schedule':
                return <ScheduleSection convention={convention} />;
            case 'dealers':
                return <DealersSection convention={convention} />;
            case 'media':
                return <MediaGallerySection convention={convention} />;
            default:
                return <BasicInfoSection convention={convention} />;
        }
    };

    return (
        <Container id="main-content" maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
                {/* Left Sidebar Navigation */}
                <Paper
                    sx={{
                        width: 200,
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
                                            pl: 2,
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