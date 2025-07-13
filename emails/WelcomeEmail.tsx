import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface WelcomeEmailProps {
    name: string;
    userEmail: string;
    dashboardUrl: string;
    gettingStartedUrl: string;
}

const WelcomeEmail = ({
    name,
    userEmail,
    dashboardUrl,
    gettingStartedUrl,
}: WelcomeEmailProps) => {
    return (
        <EmailLayout previewText="Welcome to Convention Crasher!">
            <Heading style={heading}>Welcome to Convention Crasher!</Heading>

            <Text style={text}>
                Hi {name},
            </Text>

            <Text style={text}>
                Welcome to Convention Crasher! We're thrilled to have you join our community
                of convention enthusiasts and organizers.
            </Text>

            <Text style={text}>
                <strong>What you can do on Convention Crasher:</strong>
            </Text>

            <Text style={listItem}>• Discover amazing conventions near you</Text>
            <Text style={listItem}>• Register for events and manage your tickets</Text>
            <Text style={listItem}>• Connect with other attendees</Text>
            <Text style={listItem}>• Apply to become a convention organizer</Text>

            <Text style={text}>
                Ready to explore? Start by checking out your personalized dashboard.
            </Text>

            <EmailButton href={dashboardUrl}>
                Go to Dashboard
            </EmailButton>

            <Text style={text}>
                New to conventions? Check out our getting started guide to make the most
                of your Convention Crasher experience.
            </Text>

            <EmailButton href={gettingStartedUrl} variant="secondary">
                Getting Started Guide
            </EmailButton>

            <Text style={text}>
                If you have any questions, don't hesitate to reach out to our support team.
                We're here to help you have an amazing convention experience!
            </Text>

            <Text style={text}>
                Welcome aboard!<br />
                The Convention Crasher Team
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

export default WelcomeEmail; 