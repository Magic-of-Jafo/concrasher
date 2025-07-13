import {
    Button,
    Heading,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';
import EmailLayout from './shared/EmailLayout';

interface EmailVerificationEmailProps {
    userName?: string;
    verificationUrl?: string;
}

export const EmailVerificationEmail = ({
    userName,
    verificationUrl,
}: EmailVerificationEmailProps) => (
    <EmailLayout previewText="Verify your email to activate your Convention Crasher account.">
        <Heading style={h1}>Verify Your Email</Heading>
        <Text style={text}>
            Hello {userName},
        </Text>
        <Text style={text}>
            Thank you for signing up for Convention Crasher! To complete your registration and secure your account, please verify your email address by clicking the button below.
        </Text>
        <Section style={{ textAlign: 'center' }}>
            <Button
                style={button}
                href={verificationUrl}
            >
                Verify Email Address
            </Button>
        </Section>
        <Text style={text}>
            If you did not sign up for an account, you can safely ignore this email.
        </Text>
        <Text style={text}>
            Best,
            <br />
            The Convention Crasher Team
        </Text>
    </EmailLayout>
);

export default EmailVerificationEmail;

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '30px 0',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
};

const button = {
    backgroundColor: '#5e72e4',
    color: '#ffffff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 20px',
    borderRadius: '4px',
    fontWeight: 'bold',
}; 