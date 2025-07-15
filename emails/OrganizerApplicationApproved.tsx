import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface OrganizerApplicationApprovedProps {
    userName?: string;
    userEmail?: string;
    organizerDashboardUrl?: string;
}

const OrganizerApplicationApproved = ({
    userName = 'there',
    userEmail = 'organizer@example.com',
    organizerDashboardUrl = 'https://conventioncrasher.com/organizer/conventions',
}: OrganizerApplicationApprovedProps) => {
    return (
        <EmailLayout previewText="Welcome to Convention Crasher - You're approved!">
            <Heading style={heading}>Welcome to Convention Crasher!</Heading>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Congratulations! Your application to become a Convention Organizer has been approved.
                You can now start creating and managing conventions on Convention Crasher.
            </Text>

            <EmailButton href={organizerDashboardUrl}>
                Access Organizer Dashboard
            </EmailButton>

            <Text style={text}>
                Welcome to the Convention Crasher community! We're excited to see what amazing events you'll create.
            </Text>
        </EmailLayout>
    );
};

// Styles
const heading = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 20px',
};

const text = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 16px',
};

export default OrganizerApplicationApproved; 