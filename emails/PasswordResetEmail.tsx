import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface PasswordResetEmailProps {
    userEmail: string;
    resetUrl: string;
    userName?: string;
}

const PasswordResetEmail = ({
    userEmail,
    resetUrl,
    userName = 'there',
}: PasswordResetEmailProps) => {
    return (
        <EmailLayout previewText="Reset your password">
            <Heading style={heading}>Reset Your Password</Heading>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                We received a request to reset your password for your Convention Crasher account.
                Click the button below to create a new password.
            </Text>

            <EmailButton href={resetUrl}>
                Reset Password
            </EmailButton>

            <Text style={text}>
                If you didn't request a password reset, you can safely ignore this email.
                Your password will remain unchanged.
            </Text>

            <Text style={smallText}>
                This password reset link will expire in 1 hour for security reasons.
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

export default PasswordResetEmail; 