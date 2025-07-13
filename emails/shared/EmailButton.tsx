import React from 'react';
import { Button } from '@react-email/components';

interface EmailButtonProps {
    href: string;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
}

const EmailButton = ({ href, children, variant = 'primary' }: EmailButtonProps) => {
    const buttonStyle = variant === 'primary' ? primaryButton : secondaryButton;

    return (
        <Button href={href} style={buttonStyle}>
            {children}
        </Button>
    );
};

const primaryButton = {
    backgroundColor: '#1f2937',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px 24px',
    fontWeight: 'bold',
};

const secondaryButton = {
    backgroundColor: 'transparent',
    border: '2px solid #1f2937',
    borderRadius: '6px',
    color: '#1f2937',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px 24px',
    fontWeight: 'bold',
};

export default EmailButton; 