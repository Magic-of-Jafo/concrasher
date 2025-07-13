import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import React from 'react';
import WelcomeEmail from '../../emails/WelcomeEmail';

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
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile`;

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