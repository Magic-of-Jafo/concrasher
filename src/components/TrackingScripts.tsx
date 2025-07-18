'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// A robust function to wait for tracking functions to be ready
const waitForTrackingFunction = (functionName: string, maxAttempts = 20): Promise<void> => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            if (typeof window[functionName as keyof Window] === 'function') {
                resolve();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(check, 150);
            } else {
                reject(new Error(`${functionName} not loaded after multiple attempts.`));
            }
        };
        check();
    });
};

// The component function should match the file name.
export function TrackingScripts() {
    const pathname = usePathname();

    useEffect(() => {
        const trackPageView = async () => {
            // Meta Pixel tracking
            try {
                await waitForTrackingFunction('fbq');
                if (window.fbq) {
                    window.fbq('track', 'PageView');
                }
            } catch (error) {
                // Meta Pixel not available - this is expected if no tracking scripts are loaded
            }

            // Google Analytics 4 tracking
            try {
                await waitForTrackingFunction('gtag');
                if (window.gtag) {
                    window.gtag('event', 'page_view', {
                        page_path: pathname,
                    });
                }
            } catch (error) {
                // GA4 not available - this is expected if no tracking scripts are loaded
            }
        };

        trackPageView();

    }, [pathname]); // This dependency array ensures the effect runs on every path change

    // This component's only job is to run the effect; it renders no HTML.
    return null;
}

// Extend the Window interface for TypeScript to recognize tracking functions
declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
        gtag?: (...args: any[]) => void;
    }
}