import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('=== SIGNUP WEBHOOK TRIGGER ===');

        const body = await request.json();
        console.log('Received signup data:', body);

        const webhookUrl = 'https://n8n.getjafo.diskstation.me/webhook/e77cf175-6aee-46bb-a5af-4f00cd2969fb';

        console.log('Sending signup request to:', webhookUrl);

        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        console.log('Webhook response status:', webhookResponse.status);
        console.log('Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()));

        if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            console.error('Webhook error:', errorText);
            return NextResponse.json(
                { error: `Webhook failed with status ${webhookResponse.status}: ${errorText}` },
                { status: webhookResponse.status }
            );
        }

        const responseText = await webhookResponse.text();
        console.log('Webhook response:', responseText);

        // Try to parse the response as JSON
        try {
            const responseData = JSON.parse(responseText);
            return NextResponse.json(responseData);
        } catch (e) {
            // If not JSON, return as text
            return NextResponse.json({
                message: 'Signup successful',
                response: responseText
            });
        }

    } catch (error) {
        console.error('Error in signup webhook API:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
} 