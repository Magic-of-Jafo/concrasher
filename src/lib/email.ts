import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import React from 'react';
import WelcomeEmail from '../../emails/WelcomeEmail';
import PasswordResetEmail from '../../emails/PasswordResetEmail';
import PasswordChangedEmail from '../../emails/PasswordChangedEmail';
import OrganizerApplicationApproved from '../../emails/OrganizerApplicationApproved';

// Configure the SES client for AWS SDK v3
const ses = new SESClient({
  region: process.env.SES_AWS_REGION,
  credentials: {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY!,
  },
});

// Create a Nodemailer transporter that uses the SES client
const transporter = nodemailer.createTransport({
  SES: { ses, aws: { SendRawEmailCommand } }, // Pass the command class
});

export const sendEmail = async ({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) => {
  const html = await render(react);

  const options: Mail.Options = {
    from: '"Convention Crasher" <noreply@conventioncrasher.com>',
    to,
    subject,
    html,
  };

  try {
    const result = await transporter.sendMail(options);
    console.log(`[Email Lib] Email sent successfully to ${to}. Message ID:`, result.messageId);
    return { success: true };
  } catch (error) {
    console.error('[Email Lib] CRITICAL: Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

export const sendWelcomeEmail = async (name: string | null | undefined, email: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  const dashboardUrl = `${appUrl}/profile`;

  return sendEmail({
    to: email,
    subject: 'Welcome to Convention Crasher!',
    react: React.createElement(WelcomeEmail, {
      name: name || undefined,
      userEmail: email,
      dashboardUrl,
    }),
  });
};

export const sendPasswordResetEmail = async (email: string, resetUrl: string, userName?: string) => {
  return sendEmail({
    to: email,
    subject: 'Reset Your Convention Crasher Password',
    react: React.createElement(PasswordResetEmail, {
      userEmail: email,
      resetUrl,
      userName: userName || 'there',
    }),
  });
};

export const sendPasswordChangedEmail = async (email: string, userName?: string) => {
  const supportUrl = 'https://conventioncrasher.com/support';

  return sendEmail({
    to: email,
    subject: 'Your Convention Crasher Password Has Been Changed',
    react: React.createElement(PasswordChangedEmail, {
      userEmail: email,
      userName: userName || 'there',
      supportUrl,
    }),
  });
};

export const sendOrganizerApplicationApprovedEmail = async (email: string, userName?: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  const organizerDashboardUrl = `${appUrl}/organizer/conventions`;

  return sendEmail({
    to: email,
    subject: 'Your Organizer Application Has Been Approved!',
    react: React.createElement(OrganizerApplicationApproved, {
      userEmail: email,
      userName: userName || 'there',
      organizerDashboardUrl,
    }),
  });
}; 