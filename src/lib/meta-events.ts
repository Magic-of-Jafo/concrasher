// src/lib/meta-events.ts

export async function sendCapiEvent(
    eventName: string,
    userData: { email?: string; ip?: string; userAgent?: string },
    customData?: object
) {
    if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_ACCESS_TOKEN) {
        console.warn('Meta CAPI environment variables are not set. Skipping event.');
        return;
    }

    // 1. Log that the function is attempting to send an event
    console.log(`[CAPI] Attempting to send event: ${eventName}`);

    const payload = {
        data: [
            {
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: {
                    em: userData.email,
                    client_ip_address: userData.ip,
                    client_user_agent: userData.userAgent,
                },
                custom_data: customData,
            },
        ],
        // During testing, you can include the test_event_code
        // In production, you would remove this line or conditionally add it.
        test_event_code: process.env.META_TEST_EVENT_CODE,
    };

    // 2. Log the exact payload being sent to Meta for debugging
    console.log('[CAPI] Sending payload:', JSON.stringify(payload, null, 2));

    const url = `https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_ACCESS_TOKEN}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            // 3a. Log if Meta returned an error
            console.error('[CAPI] Error response from Meta:', responseData);
        } else {
            // 3b. Log a success message
            console.log('[CAPI] Event sent successfully! Response:', responseData);
        }
    } catch (error) {
        console.error('[CAPI] Failed to send event due to a network or other error:', error);
    }
}