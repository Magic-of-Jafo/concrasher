'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TrackingScriptsProps {
    scripts: string;
}

export default function TrackingScripts({ scripts }: TrackingScriptsProps) {
    const pathname = usePathname();

    useEffect(() => {
        // Trigger pageview on route changes for various tracking services
        if (typeof window !== 'undefined') {
            // Facebook Pixel
            if (window.fbq && typeof window.fbq === 'function') {
                window.fbq('track', 'PageView');
            }

            // Google Analytics (gtag)
            if (window.gtag && typeof window.gtag === 'function') {
                window.gtag('event', 'page_view', {
                    page_path: pathname,
                });
            }

            // Google Analytics (ga)
            if (window.ga && typeof window.ga === 'function') {
                window.ga('send', 'pageview', pathname);
            }

            // Microsoft Clarity
            if (window.clarity && typeof window.clarity === 'function') {
                window.clarity('set', 'page_view', pathname);
            }

            // Generic tracking for other services
            if (window.dataLayer && Array.isArray(window.dataLayer)) {
                window.dataLayer.push({
                    event: 'page_view',
                    page_path: pathname,
                });
            }
        }
    }, [pathname]);

    // Extract the script content from the tag
    const scriptContent = scripts.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');

    // Render the tracking scripts
    return (
        <script
            type="text/javascript"
            dangerouslySetInnerHTML={{ __html: scriptContent }}
        />
    );
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
        gtag?: (...args: any[]) => void;
        ga?: (...args: any[]) => void;
        clarity?: (...args: any[]) => void;
        dataLayer?: any[];
    }
} 