'use client';

import React from 'react';
import { Box, Typography, Divider, Paper, List, ListItem, ListItemText } from '@mui/material';
import RoleRequestForm from '@/components/features/RoleRequestForm';
import TalentActivationButton from '@/components/features/TalentActivationButton';
import { User, Role, RoleApplication, Brand, RequestedRole, ApplicationStatus } from '@prisma/client';
import Link from 'next/link';

interface SettingsTabProps {
    user: {
        id: string;
        roles: Role[];
        talentProfile?: {
            isActive: boolean;
        } | null;
    };
    roleApplications: Pick<RoleApplication, 'requestedRole' | 'status'>[];
    ownedBrands: Pick<Brand, 'id' | 'name'>[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({ user, roleApplications, ownedBrands }) => {
    const isBrandCreator = roleApplications.some(app => app.requestedRole === RequestedRole.BRAND_CREATOR && app.status === ApplicationStatus.APPROVED);

    return (
        <Box>
            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom>Role Management</Typography>
                <Box sx={{ my: 2 }}>
                    <TalentActivationButton
                        initialIsActive={user.talentProfile?.isActive ?? false}
                        hasTalentProfile={!!user.talentProfile}
                    />
                </Box>
                <Divider sx={{ my: 2 }} />
                <RoleRequestForm
                    currentRoles={user.roles}
                    existingApplications={roleApplications}
                />
            </Paper>

            {(isBrandCreator) && (
                <Paper sx={{ p: 4, mt: 4 }}>
                    <Typography variant="h5" gutterBottom>Brand Management</Typography>
                    <Link href="/brands/new">Create a new Brand</Link>
                    {ownedBrands.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Your Brands:</Typography>
                            <List>
                                {ownedBrands.map((brand) => (
                                    <ListItem key={brand.id} disablePadding>
                                        <Link href={`/brands/${brand.id}/edit`} passHref>
                                            <ListItemText primary={`Edit "${brand.name}"`} />
                                        </Link>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default SettingsTab; 