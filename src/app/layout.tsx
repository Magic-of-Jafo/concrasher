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
import { db } from "@/lib/db"; // Re-added for dynamic metadata
import Script from 'next/script';
import { TrackingScripts } from '@/components/TrackingScripts';

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

// ✅ RE-ADDED: Dynamic metadata generation from the database
export async function generateMetadata(): Promise<Metadata> {
  const seoSettings = await (db as any).sEOSetting.findUnique({
    where: { id: 'singleton' },
  });

  return {
    metadataBase: new URL('https://conventioncrasher.com'),
    title: {
      default: seoSettings?.organizationName || 'Convention Crasher',
      template: seoSettings?.siteTitleTemplate || '%s | Convention Crasher',
    },
    description: seoSettings?.siteDescription || 'Your one-stop portal for conventions.',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✅ RE-ADDED: Data fetching for Schema.org scripts
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

        {/* --- Microsoft Clarity --- */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "sf397fpiby");
          `}
        </Script>

        {/* --- Plerdy --- */}
        <Script id="plerdy" strategy="afterInteractive">
          {`
            (function() {
                var _protocol="https:"==document.location.protocol?"https://":"http://";
                var _site_hash_code = "2939b4919e7361bb32ea4a43c08c1b36",_suid=11718, plerdyScript=document.createElement("script");
                plerdyScript.setAttribute("defer",""),plerdyScript.dataset.plerdymainscript="plerdymainscript",
                plerdyScript.src="https://d.plerdy.com/public/js/click/main.js?v="+Math.random();
                var plerdymainscript=document.querySelector("[data-plerdymainscript='plerdymainscript']");
                plerdymainscript&&plerdymainscript.parentNode.removeChild(plerdymainscript);
                try{document.head.appendChild(plerdyScript)}catch(t){console.log(t,"unable add script tag")}
            })();
          `}
        </Script>

        {/* --- Meta Pixel --- */}
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