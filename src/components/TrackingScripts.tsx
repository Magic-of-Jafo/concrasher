'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// A robust function to wait for the Meta Pixel (fbq) to be ready
const waitForFbq = (maxAttempts = 20): Promise<void> => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            if (typeof window.fbq === 'function') {
                resolve();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(check, 150);
            } else {
                reject(new Error('Meta Pixel (fbq) not loaded after multiple attempts.'));
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
            try {
                // Wait for the pixel to be ready before trying to use it
                await waitForFbq();
                if (window.fbq) {
                    window.fbq('track', 'PageView');
                }
            } catch (error) {
                // Meta Pixel not available - this is expected if no tracking scripts are loaded
            }
        };

        trackPageView();

    }, [pathname]); // This dependency array ensures the effect runs on every path change

    // This component's only job is to run the effect; it renders no HTML.
    return null;
}

// Extend the Window interface for TypeScript to recognize fbq
declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
    }
}