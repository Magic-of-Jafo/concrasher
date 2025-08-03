import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        console.log('=== PAGE LOAD WEBHOOK TRIGGER ===');

        // Get all cookies from the request
        const allCookies = request.cookies.getAll();
        console.log('All cookies received:', allCookies);

        // Build cookie header
        const cookieHeader = allCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        console.log('Cookie header being sent:', cookieHeader);

        const webhookUrl = 'https://n8n.getjafo.diskstation.me/webhook/964f7492-ac03-4d15-8109-cd651d55304b';

        console.log('Sending page load request to:', webhookUrl);

        const webhookResponse = await fetch(webhookUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'User-Agent': 'n8n-page-load-client',
            },
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

        return NextResponse.json({
            message: 'Page load webhook triggered',
            response: responseText
        });

    } catch (error) {
        console.error('Error in page load webhook API:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
} 