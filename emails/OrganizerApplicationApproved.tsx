import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface OrganizerApplicationApprovedProps {
    userName: string;
    userEmail: string;
    organizerDashboardUrl: string;
    gettingStartedUrl: string;
}

const OrganizerApplicationApproved = ({
    userName,
    userEmail,
    organizerDashboardUrl,
    gettingStartedUrl,
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

            <Text style={text}>
                <strong>What you can do now:</strong>
            </Text>

            <Text style={listItem}>• Create and publish conventions</Text>
            <Text style={listItem}>• Manage convention details and pricing</Text>
            <Text style={listItem}>• Track registrations and attendees</Text>
            <Text style={listItem}>• Access organizer analytics</Text>

            <EmailButton href={organizerDashboardUrl}>
                Access Organizer Dashboard
            </EmailButton>

            <Text style={text}>
                New to organizing conventions? Check out our getting started guide.
            </Text>

            <EmailButton href={gettingStartedUrl} variant="secondary">
                Getting Started Guide
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

const listItem = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 8px',
    paddingLeft: '20px',
};

export default OrganizerApplicationApproved; 