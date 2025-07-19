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

export const metadata: Metadata = {
  metadataBase: new URL('https://conventioncrasher.com'),
  title: {
    default: 'Convention Crasher',
    template: '%s | Convention Crasher',
  },
  description: 'Your one-stop portal for conventions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
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

        {/* --- Plerdy (using standard script tag to force <head> placement) --- */}
        <script
          id="plerdy-script"
          defer
          data-plerdy_code="1"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                  var _protocol="https:"==document.location.protocol?"https://":"http://";
                  var _site_hash_code = "2939b4919e7361bb32ea4a43c08c1b36",_suid=11718, plerdyScript=document.createElement("script");
                  plerdyScript.setAttribute("defer",""),plerdyScript.dataset.plerdymainscript="plerdymainscript",
                  plerdyScript.src="https://d.plerdy.com/public/js/click/main.js?v="+Math.random();
                  var plerdymainscript=document.querySelector("[data-plerdymainscript='plerdymainscript']");
                  plerdymainscript&&plerdymainscript.parentNode.removeChild(plerdymainscript);
                  try{document.head.appendChild(plerdyScript)}catch(t){console.log(t,"unable add script tag")}
              })();
            `,
          }}
        />

        {/* --- Meta Pixel Base Script --- */}
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
                {/* --- Tracking Scripts (Client Component) --- */}
                <TrackingScripts />
              </NotificationProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}