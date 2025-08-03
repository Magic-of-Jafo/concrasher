import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('=== n8n-test API route called ===');
        
        const body = await request.json();
        console.log('Received request body:', body);
        
        // Extract the test data from the request
        const { testData } = body;
        console.log('Extracted test data:', testData);
        
        // The webhook URL you specified
        const webhookUrl = 'https://n8n.getjafo.diskstation.me/webhook/a6594e5b-f6c2-401d-850a-36be650f2c90';
        
        console.log('Sending to webhook URL:', webhookUrl);
        console.log('Sending data:', testData);
        
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });
        
        console.log('Webhook response status:', webhookResponse.status);
        console.log('Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()));
        
        // Read response as text first
        const responseText = await webhookResponse.text();
        console.log('Webhook response text:', responseText);
        
        let responseData;
        try {
            // Try to parse as JSON
            responseData = JSON.parse(responseText);
            console.log('Webhook success response (parsed JSON):', responseData);
        } catch (parseError) {
            // If not JSON, return as message
            console.log('Response is not JSON, treating as text message');
            responseData = { message: responseText };
        }
        
        if (webhookResponse.ok) {
            return NextResponse.json(responseData);
        } else {
            console.log('Webhook failed with status:', webhookResponse.status);
            return NextResponse.json(
                { error: `Webhook failed with status ${webhookResponse.status}` },
                { status: webhookResponse.status }
            );
        }
        
    } catch (error) {
        console.error('Error in n8n-test API route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 