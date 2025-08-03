import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    console.log('Waypoint API route called');
    try {
        const body = await request.json();
        const { chatInput, topic_id, mode } = body;
        console.log('Received payload:', { chatInput, topic_id, mode });

        // Validate required fields
        if (!chatInput) {
            return NextResponse.json(
                { error: 'Missing required field: chatInput' },
                { status: 400 }
            );
        }

        // Get the authentication key from environment variables
        const key = process.env.HEADER_AUTH;
        console.log('HEADER_AUTH value:', key ? '***' + key.slice(-4) : 'NOT SET');
        if (!key) {
            return NextResponse.json(
                { error: 'Authentication key not configured' },
                { status: 500 }
            );
        }

        // Prepare the payload for the webhook
        const webhookPayload = {
            chatInput,
            topic_id: topic_id || null,
            mode: mode || 1,
            key,
        };

        console.log('Sending to webhook:', webhookPayload);
        // Send request to the n8n webhook
        const webhookResponse = await fetch(
            'https://n8n.getjafo.diskstation.me/webhook/54a248f1-a416-4941-ae54-f83252f749dc',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'key': key,
                },
                body: JSON.stringify({
                    chatInput,
                    topic_id: topic_id || null,
                    mode: mode || 1,
                }),
            }
        );

        if (!webhookResponse.ok) {
            console.error('Webhook error:', webhookResponse.status, webhookResponse.statusText);
            const errorText = await webhookResponse.text();
            console.error('Webhook error response:', errorText);
            return NextResponse.json(
                { error: `Webhook request failed: ${webhookResponse.status} - ${errorText}` },
                { status: webhookResponse.status }
            );
        }

        // Get the response from the webhook
        let webhookData;
        const responseText = await webhookResponse.text();

        try {
            webhookData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.log('Webhook returned non-JSON response:', responseText);
            webhookData = { message: responseText || 'No response content' };
        }

        // Return the webhook response to the client
        return NextResponse.json({
            success: true,
            response: webhookData.output || webhookData.response || webhookData.message || responseText || 'Webhook executed successfully',
            originalResponse: webhookData,
        });

    } catch (error) {
        console.error('Waypoint API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 