import React from 'react';
import {
    Html,
    Head,
    Preview,
    Body,
    Container,
    Heading,
    Section,
    Text,
} from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';
import { CSSProperties } from 'react';

interface WelcomeEmailProps {
    name?: string;
    userEmail: string;
    dashboardUrl: string;
}

const WelcomeEmail = ({
    name,
    userEmail,
    dashboardUrl,
}: WelcomeEmailProps) => {
    const features = [
        {
            number: 1,
            title: 'Experience world-class magic',
            description: 'See live performances by some of the best in the industry.',
        },
        {
            number: 2,
            title: 'Learn from top creators',
            description: 'Attend sessions taught by the very performers and thinkers you admire.',
        },
        {
            number: 3,
            title: 'Jam in person',
            description: 'Share ideas and effects face-to-face—something you can’t replicate online.',
        },
        {
            number: 4,
            title: 'Discover what’s next',
            description: 'Explore the latest trends and products shaping the art.',
        },
    ];

    return (
        <EmailLayout previewText="Welcome to ConventionCrasher!">
            <Heading style={heading}>Welcome to ConventionCrasher!</Heading>

            <Text style={text}>Hi {name || 'there'},</Text>

            <Text style={text}>
                You’ve just joined the only platform built specifically for the performance magic convention community.
                Whether you’re here to find your next great event, connect with others, or just stay in the loop—
                you’re in the right place.
            </Text>

            <Text style={text}>Here’s what you’ll get from showing up:</Text>

            {features.map((feature) => (
                <Section style={section} key={feature.number}>
                    <div style={itemWrapper}>
                        <span style={badge}>{feature.number}</span>
                        <div>
                            <Heading as="h2" style={itemTitle}>
                                {feature.title}
                            </Heading>
                            <Text style={itemText}>{feature.description}</Text>
                        </div>
                    </div>
                </Section>
            ))}

            <Text style={text}>Setting up your profile is the best way to get started.</Text>

            <EmailButton href={dashboardUrl}>Go to Dashboard</EmailButton>

            <Text style={text}>
                <br />
                <br />
                Welcome aboard!
                <br />
                The ConventionCrasher Team
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

const section = {
    marginBottom: '15px',
};

const itemWrapper = {
    display: 'table', // Email-safe layout alternative to flex
    marginLeft: '12px',
    marginRight: '32px',
};

const badge: CSSProperties = {
    display: 'inline-block',
    verticalAlign: 'top',
    marginRight: '18px',
    height: '24px',
    width: '24px',
    borderRadius: '9999px',
    backgroundColor: '#983b30',
    color: 'white',
    fontWeight: 600,
    fontSize: '12px',
    lineHeight: '24px',
    textAlign: 'center',
};

const itemTitle = {
    marginTop: 0,
    marginBottom: '0px',
    fontSize: '18px',
    lineHeight: '28px',
    color: '#111827',
};

const itemText = {
    margin: 0,
    fontSize: '14px',
    lineHeight: '24px',
    color: '#6b7280',
};

export default WelcomeEmail;