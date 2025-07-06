'use client';

import React from 'react';
import NextLink from 'next/link';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Avatar,
    Button,
} from '@mui/material';

interface TalentSectionProps {
    convention: any;
}

export default function TalentSection({ convention }: TalentSectionProps) {
    const { talent = [] } = convention;

    if (talent.length === 0) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Featured Talent
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Featured talent for this convention has not been announced yet.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Featured Talent
            </Typography>
            <Grid container spacing={3}>
                {talent.map((t: any) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar
                                    src={t.talent.profileImageUrl || ''}
                                    alt={t.talent.name}
                                    sx={{ width: 120, height: 120, margin: '0 auto 16px' }}
                                />
                                <Typography variant="h6" component="div">
                                    {t.talent.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    {t.bio}
                                </Typography>
                                {t.talent.user?.username && (
                                    <Button
                                        component={NextLink}
                                        href={`/profile/${t.talent.user.username}`}
                                        variant="text"
                                    >
                                        View Profile
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
} 