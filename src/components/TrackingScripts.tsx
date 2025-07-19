'use client';

import { useEffect, useRef } from 'react'; // 👈 Import useRef
import { usePathname } from 'next/navigation';

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
    const trackedPathnameRef = useRef<string | null>(null); // 👈 Add a ref to track the path

    useEffect(() => {
        // 🛑 Only track if the pathname is new and hasn't been tracked yet
        if (pathname === trackedPathnameRef.current) {
            return;
        }

        const trackPageView = async () => {
            // Meta Pixel tracking only
            try {
                await waitForTrackingFunction('fbq');
                if (window.fbq) {
                    window.fbq('track', 'PageView');
                }
            } catch (error) {
                console.error('[TrackingScripts] Meta Pixel failed:', error);
            }

            // ✅ Update the ref to the new path so we don't track it again
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
    }
}