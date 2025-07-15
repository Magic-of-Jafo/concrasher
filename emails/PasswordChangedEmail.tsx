import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface PasswordChangedEmailProps {
    userName: string;
    userEmail: string;
    supportUrl: string;
}

const PasswordChangedEmail = ({
    userName,
    userEmail,
    supportUrl,
}: PasswordChangedEmailProps) => {
    return (
        <EmailLayout previewText="Your password has been changed">
            <Heading style={heading}>Password Changed Successfully</Heading>

            <Text style={text}>
                Hi {userName},
            </Text>

            <Text style={text}>
                This email confirms that your Convention Crasher account password was successfully changed.
            </Text>

            <Text style={text}>
                If you made this change, no further action is required. Your account is secure.
            </Text>

            <Text style={warningBox}>
                <strong>⚠️ Didn't change your password?</strong><br />
                If you didn't request this change, your account may be compromised.
                Please contact support immediately.
            </Text>

            <EmailButton href={supportUrl}>
                Contact Support
            </EmailButton>
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

export default PasswordChangedEmail; 