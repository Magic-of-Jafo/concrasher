import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface ConventionPublishedEmailProps {
    organizerName: string;
    conventionName: string;
    conventionUrl: string;
    conventionDate: string;
    conventionLocation: string;
    dashboardUrl: string;
}

const ConventionPublishedEmail = ({
    organizerName,
    conventionName,
    conventionUrl,
    conventionDate,
    conventionLocation,
    dashboardUrl,
}: ConventionPublishedEmailProps) => {
    return (
        <EmailLayout previewText={`${conventionName} is now live!`}>
            <Heading style={heading}>Your Convention is Live!</Heading>

            <Text style={text}>
                Hi {organizerName},
            </Text>

            <Text style={text}>
                Great news! Your convention "<strong>{conventionName}</strong>" has been successfully published
                and is now live on Convention Crasher.
            </Text>

            <Text style={infoBox}>
                <strong>{conventionName}</strong><br />
                📅 {conventionDate}<br />
                📍 {conventionLocation}
            </Text>

            <Text style={text}>
                Your convention is now discoverable by attendees and ready to accept registrations.
            </Text>

            <EmailButton href={conventionUrl}>
                View Your Convention
            </EmailButton>

            <Text style={text}>
                <strong>What's next?</strong>
            </Text>

            <Text style={listItem}>• Share your convention link on social media</Text>
            <Text style={listItem}>• Monitor registrations in your dashboard</Text>
            <Text style={listItem}>• Update convention details as needed</Text>
            <Text style={listItem}>• Engage with potential attendees</Text>

            <EmailButton href={dashboardUrl} variant="secondary">
                Manage Convention
            </EmailButton>

            <Text style={text}>
                Congratulations on taking this step! We're excited to see your convention succeed.
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

const infoBox = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    margin: '16px 0',
};

const listItem = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 8px',
    paddingLeft: '20px',
};

export default ConventionPublishedEmail; 