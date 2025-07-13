import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface OrganizerApplicationRejectedProps {
    userName: string;
    userEmail: string;
    reason?: string;
    reapplyUrl: string;
    supportUrl: string;
}

const OrganizerApplicationRejected = ({
    userName,
    userEmail,
    reason,
    reapplyUrl,
    supportUrl,
}: OrganizerApplicationRejectedProps) => {
    return (
        <EmailLayout previewText="Update on your organizer application">
            <Heading style={heading}>Application Status Update</Heading>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Thank you for your interest in becoming a Convention Organizer on Convention Crasher.
                After careful review, we're unable to approve your application at this time.
            </Text>

            {reason && (
                <Text style={text}>
                    <strong>Reason:</strong> {reason}
                </Text>
            )}

            <Text style={text}>
                Don't worry - you can reapply in the future! We encourage you to:
            </Text>

            <Text style={listItem}>• Gain more event organizing experience</Text>
            <Text style={listItem}>• Build a stronger online presence</Text>
            <Text style={listItem}>• Attend conventions as a participant first</Text>
            <Text style={listItem}>• Connect with other organizers in the community</Text>

            <Text style={text}>
                You can reapply for organizer status after 30 days.
            </Text>

            <EmailButton href={reapplyUrl} variant="secondary">
                Learn About Reapplying
            </EmailButton>

            <Text style={text}>
                If you have questions about this decision, please don't hesitate to contact our support team.
            </Text>

            <EmailButton href={supportUrl}>
                Contact Support
            </EmailButton>

            <Text style={text}>
                Thank you for your understanding, and we hope to see you in the Convention Crasher community!
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

export default OrganizerApplicationRejected; 