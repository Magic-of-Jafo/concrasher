import type { Metadata } from "next";
import { Inter, Roboto_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/session-provider";
import QueryProvider from "@/components/providers/query-provider";
import ThemeProviders from "@/components/providers/theme-provider";
import { NotificationProvider } from "@/components/NotificationContext";
import { ErrorHandler } from "@/components/ErrorHandler";
import Header from "@/components/layout/Header";
import { Suspense } from 'react';
import { db } from "@/lib/db";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '700', '800'], // Regular, Bold, ExtraBold
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const seoSettings = await (db as any).sEOSetting.findUnique({
    where: { id: 'singleton' },
  });

  return {
    title: {
      default: seoSettings?.organizationName || 'Convention Crasher',
      template: seoSettings?.siteTitleTemplate || '%s',
    },
    description: seoSettings?.siteDescription || 'Your one-stop portal for conventions.',
    keywords: seoSettings?.defaultKeywords || [],
  };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seoSettings = await (db as any).sEOSetting.findUnique({
    where: { id: 'singleton' },
  });

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seoSettings?.organizationName,
    url: seoSettings?.organizationUrl,
    logo: seoSettings?.organizationLogo,
    sameAs: seoSettings?.socialProfiles,
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: seoSettings?.organizationUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${seoSettings?.organizationUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };


  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        {/* Custom meta tags */}
        <meta httpEquiv="x-error-message" content="" />

        {/* Organization structured data */}
        {seoSettings && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema, null, 2) }}
          />
        )}

        {/* Website structured data */}
        {seoSettings && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema, null, 2) }}
          />
        )}
      </head>
      <body className={`${robotoMono.variable} antialiased`}>
        <ThemeProviders>
          <AuthProvider>
            <QueryProvider>
              <NotificationProvider>
                <Suspense fallback={null}>
                  <ErrorHandler />
                </Suspense>
                {/* Skip link for keyboard users */}
                <a
                  href="#main-content"
                  className="skip-link"
                >
                  Skip to main content
                </a>
                <Header />
                <Suspense fallback={<div>Loading...</div>}>
                  {children}
                </Suspense>
              </NotificationProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}
