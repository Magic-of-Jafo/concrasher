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
import Script from 'next/script';
import { TrackingScripts } from '@/components/TrackingScripts';

const parseScriptTag = (scriptString: string) => {
  const attributes: { [key: string]: string | boolean } = {};
  const attributeRegex = /([\w-]+)=(['"])(.*?)\2/g;
  let match;
  while ((match = attributeRegex.exec(scriptString)) !== null) {
    attributes[match[1]] = match[3];
  }
  if (scriptString.includes(' defer')) attributes.defer = true;
  if (scriptString.includes(' async')) attributes.async = true;

  const contentRegex = /<script[^>]*>([\s\S]*?)<\/script>/;
  const contentMatch = scriptString.match(contentRegex);
  const innerContent = contentMatch ? contentMatch[1].trim() : '';

  return { attributes, innerContent };
};

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
  weight: ['400', '700', '800'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const seoSettings = await (db as any).sEOSetting.findUnique({
    where: { id: 'singleton' },
  });

  return {
    metadataBase: new URL('https://conventioncrasher.com'),
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

  const dbTrackingScripts = seoSettings?.trackingScripts
    ? seoSettings.trackingScripts.split(/(?=<\s*script)/).filter((s: string) => s.trim())
    : [];

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
        {/* Schema.org scripts */}
        {seoSettings && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema, null, 2) }}
          />
        )}
        {seoSettings && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema, null, 2) }}
          />
        )}

        {/* Database-Injected Scripts (Clarity, Plerdy, etc.) */}
        {dbTrackingScripts.map((scriptString: string, index: number) => {
          const { attributes, innerContent } = parseScriptTag(scriptString);
          return (
            <Script key={`db-script-${index}`} {...attributes}>
              {innerContent}
            </Script>
          );
        })}

        {/* ✅ CORRECTED: Meta Pixel Implementation MOVED to the <head> */}
        <TrackingScripts />
        <Script id="meta-pixel-base" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            
            fbq('init', '282675836122405');
            fbq('set', 'autoConfig', 'false', '282675836122405');
          `}
        </Script>
      </head>
      <body className={`${robotoMono.variable} antialiased`}>
        <ThemeProviders>
          <AuthProvider>
            <QueryProvider>
              <NotificationProvider>
                <Suspense fallback={null}>
                  <ErrorHandler />
                </Suspense>
                <a href="#main-content" className="skip-link">
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