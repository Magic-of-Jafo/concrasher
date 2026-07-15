'use client';

import React, { useState } from 'react';
import { Box, Button, Alert, CircularProgress, Chip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VenueHotelHelperDialog, { type VenueHotelAssignment, type ScrapedPlaceResult } from '../convention-editor/VenueHotelHelperDialog';
import type { WizardStepContext } from './ConventionWizard';

// Wizard step: import the venue + hotel(s) from the discovered hotel/venue page
// (or a URL the organizer pastes) and save straight to the convention.

const placeCommon = (p: ScrapedPlaceResult) => ({
    description: p.description || undefined,
    websiteUrl: p.websiteUrl || undefined,
    googleMapsUrl: p.googleMapsUrl || undefined,
    streetAddress: p.streetAddress || undefined,
    city: p.city || undefined,
    stateRegion: p.stateRegion || undefined,
    postalCode: p.postalCode || undefined,
    country: p.country || undefined,
    contactEmail: p.contactEmail || undefined,
    contactPhone: p.contactPhone || undefined,
    groupPrice: p.groupPrice || undefined,
    groupRateOrBookingCode: p.groupRateOrBookingCode || undefined,
    bookingLink: p.bookingLink || undefined,
    bookingCutoffDate: p.bookingCutoffDate || undefined,
    amenities: p.amenities?.length ? p.amenities : undefined,
});

export default function WizardVenueStep({ ctx }: { ctx: WizardStepContext }) {
    const { convention, refresh, discovered } = ctx;
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apply = async (a: VenueHotelAssignment) => {
        setSaving(true);
        setError(null);
        try {
            // Honor the roles the organizer chose in the preview.
            const venues = a.places
                .filter(x => x.role === 'primaryVenue' || x.role === 'secondaryVenue')
                .map(x => ({ isPrimaryVenue: x.role === 'primaryVenue', venueName: x.place.name || 'Venue', ...placeCommon(x.place) }));
            const hotels = a.places
                .filter(x => x.role === 'primaryHotel' || x.role === 'secondaryHotel')
                .map(x => ({ isPrimaryHotel: x.role === 'primaryHotel', hotelName: x.place.name || 'Hotel', ...placeCommon(x.place) }));
            const res = await fetch(`/api/organizer/conventions/${convention.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // The stay-at-venue toggle is set explicitly on the venue tab,
                // not inferred from the scrape.
                body: JSON.stringify({ venues, hotels }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to save.');
            }
            await refresh();
            setSaved(true);
        } catch (e: any) {
            setError(e?.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            {discovered?.hotel && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    We found a likely venue/hotel page and pre-filled it — just click below.
                </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                    onClick={() => { setSaved(false); setOpen(true); }}
                    disabled={saving}
                >
                    Import venue &amp; hotel
                </Button>
                {saved && <Chip size="small" color="success" label="Saved to your listing" />}
            </Box>
            {error && <Alert severity="warning" sx={{ mt: 1.5 }}>{error}</Alert>}

            {open && (
                <VenueHotelHelperDialog
                    open={open}
                    onClose={() => setOpen(false)}
                    conventionId={convention.id}
                    initialUrl={discovered?.hotel || convention.websiteUrl || ''}
                    onApplied={apply}
                />
            )}
        </Box>
    );
}
