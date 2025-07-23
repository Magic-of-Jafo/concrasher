'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Link, Button } from '@mui/material';
import {
    Email as EmailIcon,
    Language as WebsiteIcon,
    ContactMail as ContactIcon,
    Info as InfoIcon,
    Person as PersonIcon
} from '@mui/icons-material';

interface ContactTabProps {
    talentProfile: {
        displayName: string;
        contactEmail: string | null;
        websiteUrl: string | null;
        user: {
            id: string;
        };
    };
}

const ContactTab: React.FC<ContactTabProps> = ({ talentProfile }) => {
    const hasContactInfo = talentProfile.contactEmail || talentProfile.websiteUrl;

    return (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Contact & Booking Information
            </Typography>

            {/* User Profile Link */}
            <Box sx={{ mb: 3 }}>
                <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: 'rgba(102, 126, 234, 0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <PersonIcon sx={{ color: '#667eea', fontSize: '1.2rem' }} />
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                                Personal Profile
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                            View {talentProfile.displayName}'s personal user profile for additional information and community presence.
                        </Typography>
                        <Button
                            variant="contained"
                            component="a"
                            href={`/u/${talentProfile.user.id}`}
                            startIcon={<PersonIcon />}
                            sx={{
                                backgroundColor: '#667eea',
                                color: 'white',
                                fontWeight: 600,
                                '&:hover': {
                                    backgroundColor: '#5a6fd8',
                                },
                            }}
                        >
                            View User Profile
                        </Button>
                    </CardContent>
                </Card>
            </Box>

            {hasContactInfo ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Professional Contact */}
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
                                Professional Contact
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {talentProfile.contactEmail && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <EmailIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                                Email
                                            </Typography>
                                            <Link
                                                href={`mailto:${talentProfile.contactEmail}`}
                                                variant="body1"
                                                sx={{
                                                    color: 'primary.main',
                                                    textDecoration: 'none',
                                                    fontWeight: 500,
                                                    '&:hover': {
                                                        textDecoration: 'underline',
                                                    },
                                                }}
                                            >
                                                {talentProfile.contactEmail}
                                            </Link>
                                        </Box>
                                    </Box>
                                )}

                                {talentProfile.websiteUrl && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <WebsiteIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                                Website
                                            </Typography>
                                            <Link
                                                href={talentProfile.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                variant="body1"
                                                sx={{
                                                    color: 'primary.main',
                                                    textDecoration: 'none',
                                                    fontWeight: 500,
                                                    '&:hover': {
                                                        textDecoration: 'underline',
                                                    },
                                                }}
                                            >
                                                {talentProfile.websiteUrl}
                                            </Link>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Booking Information */}
                    <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: 'grey.50' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <InfoIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                                    Booking Information
                                </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
                                For bookings, appearances, and collaboration inquiries, please use the contact information above.
                                Response times may vary based on current booking schedule.
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label="Professional Inquiries"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                />
                                <Chip
                                    label="Convention Appearances"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                />
                                <Chip
                                    label="Collaborations"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            ) : (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 6,
                        px: 2,
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        color: 'text.secondary',
                    }}
                >
                    <ContactIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        Contact Information Not Available
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                        This talent hasn't provided public contact information yet.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default ContactTab; 