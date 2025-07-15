import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface AdminNewApplicationEmailProps {
    applicantName?: string;
    applicantEmail?: string;
    requestedRoles?: string[];
    reviewUrl?: string;
}

const AdminNewApplicationEmail = ({
    applicantName = 'John Doe',
    applicantEmail = 'john.doe@example.com',
    requestedRoles = ['Convention Organizer'],
    reviewUrl = 'https://conventioncrasher.com/profile/admin',
}: AdminNewApplicationEmailProps) => {
    const rolesText = requestedRoles.join(' and ');

    return (
        <EmailLayout previewText="New role application pending review">
            <Heading style={heading}>New Role Application</Heading>

            <Text style={text}>
                Hi Admin,
            </Text>

            <Text style={text}>
                A new role application has been submitted and is pending your review.
            </Text>

            <Text style={infoBox}>
                <strong>Application Details:</strong><br />
                <strong>Applicant:</strong> {applicantName}<br />
                <strong>Email:</strong> {applicantEmail}<br />
                <strong>Requested Role{requestedRoles.length > 1 ? 's' : ''}:</strong> {rolesText}
            </Text>

            <Text style={text}>
                Please review the application and make a decision within 2-3 business days
                to maintain our response time commitment.
            </Text>

            <EmailButton href={reviewUrl}>
                Review Application
            </EmailButton>

            <Text style={text}>
                <strong>Review checklist:</strong>
            </Text>

            <Text style={listItem}>• Verify applicant's experience and qualifications</Text>
            <Text style={listItem}>• Check provided references and portfolio</Text>
            <Text style={listItem}>• Assess alignment with platform standards</Text>
            <Text style={listItem}>• Ensure complete application information</Text>

            <Text style={text}>
                This is an automated notification. Please do not reply to this email.
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

const listItem = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 8px',
    paddingLeft: '20px',
};

export default AdminNewApplicationEmail; 