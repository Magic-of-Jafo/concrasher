import React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Link,
    Hr,
    Img,
} from '@react-email/components';
import { getS3ImageUrl } from '@/lib/defaults';

interface EmailLayoutProps {
    children: React.ReactNode;
    previewText?: string;
}

const EmailLayout = ({ children, previewText }: EmailLayoutProps) => {
    const logoUrl = getS3ImageUrl('/images/defaults/convention-crasher-logo.png');

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Img
                            src={logoUrl}
                            alt="Convention Crasher"
                            style={logoStyle}
                        />

                    </Section>


                    {/* Main Content */}
                    <Section style={content}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Hr style={hr} />
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Convention Crasher. All rights reserved.
                        </Text>
                        <Text style={footerText}>
                            <Link href="https://conventioncrasher.com/unsubscribe" style={footerLink}>
                                Unsubscribe
                            </Link>
                            {' | '}
                            <Link href="https://conventioncrasher.com/privacy" style={footerLink}>
                                Privacy Policy
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
};

const header = {
    padding: '20px 30px',
    backgroundColor: '#2c3e50',
    borderRadius: '8px 8px 0 0',
    textAlign: 'center' as const,
};

const headerText = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
    textAlign: 'center' as const,
};

const content = {
    padding: '30px',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footer = {
    padding: '0 30px 30px',
};

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0',
    textAlign: 'center' as const,
};

const footerLink = {
    color: '#556cd6',
    textDecoration: 'none',
};

const logoStyle = {
    height: '100px',
    width: 'auto',
    display: 'block',
    margin: '0 auto',
};

export default EmailLayout; 