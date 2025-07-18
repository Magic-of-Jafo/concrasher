'use client';
import { Tabs, Tab } from '@mui/material';

export interface TabData {
    label: string;
    trackingParams: {
        content_name: string;
    };
}

interface TrackedTabsProps {
    tabs: TabData[];
    contentCategory: string;
}

export function TrackedTabs({ tabs, contentCategory }: TrackedTabsProps) {
    const handleTabClick = (trackingParams: { content_name: string }) => {
        // Use setTimeout to ensure this runs after hydration
        setTimeout(() => {
            try {
                // Meta Pixel tracking
                if (typeof window !== 'undefined' && window.fbq) {
                    window.fbq('track', 'ViewContent', {
                        ...trackingParams,
                        content_category: contentCategory,
                    });
                }

                // GA4 tracking
                if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', 'view_item', {
                        content_name: trackingParams.content_name,
                        content_category: contentCategory,
                    });
                }
            } catch (error) {
                console.warn('Tracking error:', error);
            }
        }, 0);
    };

    return (
        <Tabs>
            {tabs.map((tab) => (
                <Tab
                    key={tab.label}
                    label={tab.label}
                    onClick={() => handleTabClick(tab.trackingParams)}
                />
            ))}
        </Tabs>
    );
}

// Extend the Window interface for TypeScript to recognize tracking functions
declare global {
    interface Window {
        fbq?: (...args: any[]) => void;
        gtag?: (...args: any[]) => void;
    }
} 