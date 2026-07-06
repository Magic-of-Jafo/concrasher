'use client';

import React from 'react';
import { Box } from '@mui/material';
import { CoverImageUploader } from '../convention-editor/CoverImageUploader';
import { ProfileImageUploader } from '../convention-editor/ProfileImageUploader';
import type { WizardStepContext } from './ConventionWizard';

// Wizard step: cover + profile images. The uploaders persist to the convention
// themselves (paste / URL / file, server-side resize), so we just refresh the
// wizard's copy when one changes.
export default function WizardImagesStep({ ctx }: { ctx: WizardStepContext }) {
    const { convention, refresh } = ctx;
    const onChange = () => { refresh().catch(() => { /* non-fatal */ }); };

    return (
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 280 }}>
                <CoverImageUploader
                    conventionId={convention.id}
                    currentImageUrl={convention.coverImageUrl || undefined}
                    onImageUpdate={onChange}
                />
            </Box>
            <Box sx={{ flex: 1, minWidth: 280 }}>
                <ProfileImageUploader
                    conventionId={convention.id}
                    currentImageUrl={convention.profileImageUrl || undefined}
                    onImageUpdate={onChange}
                />
            </Box>
        </Box>
    );
}
