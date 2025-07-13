import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailVerificationEmailProps {
    userName?: string;
    userEmail?: string;
    verificationUrl?: string;
}

const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

export const EmailVerificationEmail = ({
    userName,
    userEmail,
    verificationUrl,
}: EmailVerificationEmailProps) => (
    <Html>
        <Head />
        <Preview>The sales intelligence platform that helps you uncover qualified leads.</Preview>
        <Body style={main}>
            <Container style={container}>
                <Img
                    src={`${baseUrl}/images/defaults/convention-crasher-logo.png`}
                    width="150"
                    height="38"
                    alt="Convention Crasher"
                    style={logo}
                />
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
            </Container>
        </Body>
    </Html>
);

export default EmailVerificationEmail;

const main = {
    backgroundColor: '#f6f9fc',
    padding: '20px',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px',
    border: '1px solid #dfe1e5',
    borderRadius: '8px',
};

const logo = {
    margin: '0 auto',
};

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