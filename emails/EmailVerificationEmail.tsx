import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface EmailVerificationEmailProps {
    userEmail: string;
    verificationUrl: string;
    userName?: string;
}

const EmailVerificationEmail = ({
    userEmail,
    verificationUrl,
    userName = 'there',
}: EmailVerificationEmailProps) => {
    return (
        <EmailLayout previewText="Verify your email address">
            <Heading style={heading}>Verify Your Email Address</Heading>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                Thanks for signing up for Convention Crasher! To complete your registration,
                please verify your email address by clicking the button below.
            </Text>

            <EmailButton href={verificationUrl}>
                Verify Email Address
            </EmailButton>

            <Text style={text}>
                If you didn't create an account, you can safely ignore this email.
            </Text>

            <Text style={smallText}>
                This verification link will expire in 24 hours.
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

const smallText = {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#6b7280',
    margin: '20px 0 0',
};

export default EmailVerificationEmail; 