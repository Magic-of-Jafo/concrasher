'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// A function to generate a unique event ID
const generateEventId = () => {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2);
};

// A function to wait for tracking functions to be ready
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

export function TrackingScripts() {
    const pathname = usePathname();

    useEffect(() => {
        const trackPageView = async () => {
            const eventId = generateEventId();

            // Meta Pixel tracking
            try {
                await waitForTrackingFunction('fbq');
                if (window.fbq) {
                    window.fbq('track', 'PageView', {}, { eventID: eventId });
                }
            } catch (error) {
                console.error('[TrackingScripts] Meta Pixel failed:', error);
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
                console.error('[TrackingScripts] GA4 failed:', error);
            }
        };

        // We only call trackPageView if the path is not null
        if (pathname) {
            trackPageView();
        }

    }, [pathname]); // This dependency array ensures the effect runs on every path change

    return null;
}

// Extend the Window interface for TypeScript
declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
        gtag?: (...args: any[]) => void;
    }
}