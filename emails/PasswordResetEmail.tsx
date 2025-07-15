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
        <EmailLayout previewText="Reset your Convention Crasher password">
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

            <Text style={warningBox}>
                <strong>⚠️ Security Notice:</strong><br />
                • This link will expire in 24 hours<br />
                • Only click this link if you requested a password reset<br />
                • Never share this link with anyone<br />
                • If you didn't request this, your account may be compromised
            </Text>

            <Text style={text}>
                If you didn't request a password reset, please contact our support team immediately.
            </Text>

            <EmailButton href="https://conventioncrasher.com/support" variant="secondary">
                Contact Support
            </EmailButton>

            <Text style={smallText}>
                This password reset link will expire in 24 hours for security reasons.
                If you need a new link, please request another password reset.
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

const warningBox = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
    margin: '16px 0',
};

const smallText = {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#6b7280',
    margin: '20px 0 0',
};

export default PasswordResetEmail; 