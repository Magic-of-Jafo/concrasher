import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface OrganizerApplicationSubmittedProps {
    userName: string;
    userEmail: string;
    applicationId: string;
    dashboardUrl: string;
}

const OrganizerApplicationSubmitted = ({
    userName,
    userEmail,
    applicationId,
    dashboardUrl,
}: OrganizerApplicationSubmittedProps) => {
    return (
        <EmailLayout previewText="Your organizer application has been submitted">
            <Heading style={heading}>Application Submitted Successfully</Heading>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Thank you for applying to become a Convention Organizer on Convention Crasher!
                We've received your application and it's now under review.
            </Text>

            <Text style={text}>
                <strong>Application ID:</strong> {applicationId}
            </Text>

            <Text style={text}>
                Our team will review your application and get back to you within 2-3 business days.
                You'll receive an email notification once we've made a decision.
            </Text>

            <EmailButton href={dashboardUrl}>
                View Your Dashboard
            </EmailButton>

            <Text style={text}>
                If you have any questions about your application, please don't hesitate to contact us.
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

export default OrganizerApplicationSubmitted; 