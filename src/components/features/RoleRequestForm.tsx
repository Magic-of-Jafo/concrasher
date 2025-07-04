"use client";

import React, { useState, useTransition } from 'react';
import { Button, Typography, FormGroup, FormControlLabel, Checkbox, Box, CircularProgress } from '@mui/material';
import { Role, ApplicationStatus, RequestedRole } from '@prisma/client';
import { requestRoles } from '@/lib/actions';

interface RoleApplication {
    requestedRole: RequestedRole;
    status: ApplicationStatus;
}

interface RoleRequestFormProps {
    currentRoles: Role[];
    existingApplications: RoleApplication[];
}

const AVAILABLE_ROLES_TO_REQUEST: RequestedRole[] = [
    RequestedRole.ORGANIZER,
    RequestedRole.BRAND_CREATOR,
];

export default function RoleRequestForm({
    currentRoles,
    existingApplications,
}: RoleRequestFormProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<RequestedRole[]>([]);

    const handleCheckboxChange = (role: RequestedRole, checked: boolean) => {
        setSelectedRoles(prev =>
            checked ? [...prev, role] : prev.filter(r => r !== role)
        );
    };

    const getRoleStatus = (role: RequestedRole): { hasRole: boolean; appStatus?: ApplicationStatus } => {
        const roleEnumKey = role as keyof typeof Role;
        const hasRole = currentRoles.includes(Role[roleEnumKey]);
        const application = existingApplications.find(app => app.requestedRole === role);
        return { hasRole, appStatus: application?.status };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        if (selectedRoles.length === 0) {
            setError("Please select at least one role to apply for.");
            return;
        }
        startTransition(async () => {
            const result = await requestRoles(selectedRoles);
            if (result.success) {
                setMessage(result.message || "Application(s) submitted successfully!");
                // We can potentially update the existingApplications state here to reflect the new pending status
                // For now, a full page refresh might be the simplest way to see the change
            } else {
                setError(result.error || "Failed to submit application(s).");
            }
        });
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px solid grey', borderRadius: '4px' }}>
            <Typography variant="h6" gutterBottom>Request New Roles</Typography>
            <FormGroup>
                {AVAILABLE_ROLES_TO_REQUEST.map(role => {
                    const { hasRole, appStatus } = getRoleStatus(role);
                    const isDisabled = hasRole || appStatus === 'PENDING' || appStatus === 'APPROVED';

                    let label = `Apply for ${role.replace('_', ' ')}`;
                    if (hasRole) label = `You are already a ${role.replace('_', ' ')}`;
                    else if (appStatus === 'PENDING') label = `${role.replace('_', ' ')} application is pending`;
                    else if (appStatus === 'APPROVED') label = `${role.replace('_', ' ')} application was approved`;

                    return (
                        <FormControlLabel
                            key={role}
                            control={
                                <Checkbox
                                    checked={selectedRoles.includes(role)}
                                    onChange={(e) => handleCheckboxChange(role, e.target.checked)}
                                    disabled={isDisabled || isPending}
                                />
                            }
                            label={label}
                        />
                    );
                })}
            </FormGroup>
            <Button
                type="submit"
                variant="contained"
                disabled={isPending || selectedRoles.length === 0}
                sx={{ mt: 2 }}
            >
                {isPending ? <CircularProgress size={24} /> : "Submit Request"}
            </Button>
            {message && <Typography color="primary" sx={{ mt: 1 }}>{message}</Typography>}
            {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
        </Box>
    );
} 