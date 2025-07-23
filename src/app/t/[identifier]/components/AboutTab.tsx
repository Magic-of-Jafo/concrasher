'use client';

// Updated for talent profile
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

interface AboutTabProps {
    talentProfile: {
        displayName: string;
        tagline: string | null;
        bio: string | null;
        skills: string[];
        websiteUrl: string | null;
        createdAt: Date;
    };
}

const AboutTab: React.FC<AboutTabProps> = ({ talentProfile }) => {
    return (
        <Box>
            {/* Bio Section */}
            {talentProfile.bio && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        About {talentProfile.displayName}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            lineHeight: 1.6,
                            '& p': { margin: 0, mb: 1 },
                            '& p:last-child': { mb: 0 },
                        }}
                        dangerouslySetInnerHTML={{ __html: talentProfile.bio }}
                    />
                </Box>
            )}

            {/* Skills Section */}
            {talentProfile.skills.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        Lectures & Products
                    </Typography>
                    <Box component="ul" sx={{
                        pl: 2,
                        m: 0,
                        '& li': {
                            mb: 0.5,
                            fontSize: '0.875rem',
                            lineHeight: 1.5,
                        }
                    }}>
                        {talentProfile.skills.map((skill, index) => (
                            <Typography component="li" key={index} variant="body1">
                                {skill}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Professional Information */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Professional Information
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            Professional Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {talentProfile.displayName}
                        </Typography>
                    </Box>

                    {talentProfile.tagline && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                Tagline
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, fontStyle: 'italic' }}>
                                {talentProfile.tagline}
                            </Typography>
                        </Box>
                    )}

                    {talentProfile.websiteUrl && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                Website
                            </Typography>
                            <Typography
                                component="a"
                                href={talentProfile.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body1"
                                sx={{
                                    fontWeight: 500,
                                    color: 'primary.main',
                                    textDecoration: 'none',
                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                {talentProfile.websiteUrl}
                            </Typography>
                        </Box>
                    )}

                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            Talent Since
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {new Date(talentProfile.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Empty State */}
            {!talentProfile.bio && (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 6,
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
                        This talent hasn't added a bio yet.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default AboutTab; 