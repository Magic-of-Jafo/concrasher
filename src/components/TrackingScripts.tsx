'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { generateEventId } from '@/lib/tracking-utils';

const waitForTrackingFunction = (functionName: string, maxAttempts = 30): Promise<void> => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            if (typeof window[functionName as keyof Window] === 'function') {
                resolve();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(check, 200);
            } else {
                reject(new Error(`${functionName} not loaded after ${maxAttempts} attempts.`));
            }
        };
        check();
    });
};



export function TrackingScripts() {
    const pathname = usePathname();
    const trackedPathnameRef = useRef<string | null>(null);

    useEffect(() => {
        if (pathname === trackedPathnameRef.current) {
            return;
        }

        const trackPageView = async () => {
            const eventId = generateEventId(); // ✅ Generate a unique ID for this PageView

            // Meta Pixel tracking
            try {
                await waitForTrackingFunction('fbq');
                if (window.fbq) {
                    // ✅ Send the eventId with the browser event
                    window.fbq('track', 'PageView', {}, { eventID: eventId });
                }
            } catch (error) {
                console.error('[TrackingScripts] Meta Pixel failed:', error);
            }

            // ✅ ADDED BACK: Google Analytics 4 tracking
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

            trackedPathnameRef.current = pathname;
        };

        trackPageView();

    }, [pathname]);

    return null;
}

// Extend the Window interface for TypeScript
declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
        gtag?: (...args: any[]) => void; // ✅ ADDED BACK: gtag type
    }
}