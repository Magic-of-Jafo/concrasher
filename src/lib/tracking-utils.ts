// src/lib/tracking-utils.ts

/**
 * Generate a unique event ID for Meta Pixel deduplication
 * Format: evt_[timestamp]_[random]
 */
export const generateEventId = (): string => {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2);
};

/**
 * Track a Meta Pixel event with deduplication
 */
export const trackPixelEvent = (
    eventName: string,
    parameters?: Record<string, any>,
    eventId?: string
) => {
    if (typeof window !== 'undefined' && window.fbq) {
        const eventIdToUse = eventId || generateEventId();
        window.fbq('track', eventName, parameters || {}, { eventID: eventIdToUse });
        return eventIdToUse;
    }
    return eventId || generateEventId();
};

/**
 * Track a Google Analytics 4 event
 */
export const trackGA4Event = (
    eventName: string,
    parameters?: Record<string, any>
) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, parameters);
    }
}; 