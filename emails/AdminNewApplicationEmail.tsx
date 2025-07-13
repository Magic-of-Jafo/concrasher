import React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from './shared/EmailLayout';
import EmailButton from './shared/EmailButton';

interface AdminNewApplicationEmailProps {
    applicantName: string;
    applicantEmail: string;
    applicationId: string;
    applicationDate: string;
    reviewUrl: string;
    adminDashboardUrl: string;
}

const AdminNewApplicationEmail = ({
    applicantName,
    applicantEmail,
    applicationId,
    applicationDate,
    reviewUrl,
    adminDashboardUrl,
}: AdminNewApplicationEmailProps) => {
    return (
        <EmailLayout previewText="New organizer application pending review">
            <Heading style={heading}>New Organizer Application</Heading>

            <Text style={text}>
                Hi Admin,
            </Text>

            <Text style={text}>
                A new organizer application has been submitted and is pending your review.
            </Text>

            <Text style={infoBox}>
                <strong>Application Details:</strong><br />
                <strong>Applicant:</strong> {applicantName}<br />
                <strong>Email:</strong> {applicantEmail}<br />
                <strong>Application ID:</strong> {applicationId}<br />
                <strong>Submitted:</strong> {applicationDate}
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

            <Text style={listItem}>• Verify applicant's event organizing experience</Text>
            <Text style={listItem}>• Check provided references and portfolio</Text>
            <Text style={listItem}>• Assess alignment with platform standards</Text>
            <Text style={listItem}>• Ensure complete application information</Text>

            <EmailButton href={adminDashboardUrl} variant="secondary">
                Admin Dashboard
            </EmailButton>

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