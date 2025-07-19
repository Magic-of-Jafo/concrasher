'use client';

import { useEffect, useRef } from 'react';
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
    const lastProcessedPathname = useRef<string | null>(null);

    // ✅ DEBUG: Log component mount (but only once per pathname)
    if (lastProcessedPathname.current !== pathname) {
        console.log('[TrackingScripts] Component mounted/rendered with pathname:', pathname);
    }

    useEffect(() => {
        // Prevent duplicate processing of the same pathname
        if (pathname === lastProcessedPathname.current) {
            console.log('[TrackingScripts] Skipping duplicate pathname:', pathname);
            return;
        }

        console.log('[TrackingScripts] useEffect triggered with pathname:', pathname);

        const trackPageView = async () => {
            const eventId = generateEventId();

            // ✅ DEBUG: Log when tracking is triggered
            console.log('[TrackingScripts] Tracking page view:', {
                pathname,
                eventId,
                timestamp: new Date().toISOString()
            });

            // Meta Pixel tracking
            try {
                await waitForTrackingFunction('fbq');
                if (window.fbq) {
                    window.fbq('track', 'PageView', {}, { eventID: eventId });
                    console.log('[TrackingScripts] Meta Pixel PageView sent with eventId:', eventId);
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
                    console.log('[TrackingScripts] GA4 page_view sent for pathname:', pathname);
                }
            } catch (error) {
                console.error('[TrackingScripts] GA4 failed:', error);
            }

            // Mark this pathname as processed
            lastProcessedPathname.current = pathname;
        };

        // We only call trackPageView if the path is not null
        if (pathname) {
            console.log('[TrackingScripts] Pathname changed to:', pathname);
            trackPageView();
        } else {
            console.log('[TrackingScripts] Pathname is null, skipping tracking');
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