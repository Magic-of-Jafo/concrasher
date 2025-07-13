import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface PasswordChangedEmailProps {
    userName: string;
    userEmail: string;
    changeDate: string;
    supportUrl: string;
    securityUrl: string;
}

const PasswordChangedEmail = ({
    userName,
    userEmail,
    changeDate,
    supportUrl,
    securityUrl,
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

            <Text style={infoBox}>
                <strong>Security Details:</strong><br />
                <strong>Account:</strong> {userEmail}<br />
                <strong>Changed:</strong> {changeDate}<br />
                <strong>Action:</strong> Password updated
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

            <Text style={text}>
                <strong>Security tips:</strong>
            </Text>

            <Text style={listItem}>• Use a unique password for your Convention Crasher account</Text>
            <Text style={listItem}>• Enable two-factor authentication if available</Text>
            <Text style={listItem}>• Never share your password with anyone</Text>
            <Text style={listItem}>• Update your password regularly</Text>

            <EmailButton href={securityUrl} variant="secondary">
                Review Security Settings
            </EmailButton>

            <Text style={text}>
                Thank you for keeping your account secure!
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

const warningBox = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #f87171',
    margin: '16px 0',
};

const listItem = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 8px',
    paddingLeft: '20px',
};

export default PasswordChangedEmail; 