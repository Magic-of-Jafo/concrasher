import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOpenAIConfig } from '@/lib/ai-settings';
import {
    gatherFromUrl,
    fetchImageAsDataUrl,
    bufferToDataUrl,
    pdfToText,
    extractPricingFromText,
    extractPricingFromImages,
} from '@/lib/scheduleScraper';

// POST /api/conventions/[id]/scrape-pricing
// Organizer/admin tool: read a convention's ticket pricing from a URL / PDF /
// image and return the price table(s) for the Pricing tab to populate.
// Preview-only — no DB write.
//
// JSON body:      { source: { type: 'url'|'image', url?: string } }
// multipart form: pdf=<file> | image=<file>, sourceType=pdf|image
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conv = await prisma.convention.findUnique({
        where: { id: params.id },
        select: { id: true, websiteUrl: true, registrationUrl: true, series: { select: { organizerUserId: true } } },
    });
    if (!conv) return NextResponse.json({ error: 'Convention not found' }, { status: 404 });

    const isAdmin = (session.user as any).roles?.includes('ADMIN');
    const isOwner = conv.series?.organizerUserId === session.user.id;
    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'You must be the organizer or an admin for this convention.' }, { status: 403 });
    }

    // ── parse input (JSON, or multipart for PDF / image upload) ──
    let sourceType = 'url', url = '';
    let pdfData: ArrayBuffer | null = null;
    let imageData: ArrayBuffer | null = null;
    let imageMime = 'image/jpeg';
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
        const form = await req.formData();
        sourceType = String(form.get('sourceType') || 'pdf');
        url = String(form.get('url') || '');
        const pdf = form.get('pdf');
        if (pdf && typeof pdf !== 'string') pdfData = await pdf.arrayBuffer();
        const image = form.get('image');
        if (image && typeof image !== 'string') { imageData = await image.arrayBuffer(); imageMime = image.type || 'image/jpeg'; }
    } else {
        const body = await req.json().catch(() => ({}));
        sourceType = body.source?.type || 'url';
        url = body.source?.url || '';
    }

    const { apiKey, model } = await getOpenAIConfig();
    if (!apiKey) {
        return NextResponse.json({ error: 'The helper isn\'t configured. Please contact the site administrator.' }, { status: 400 });
    }

    // ── acquire source: text and/or images ──
    let text = '';
    let images: string[] = [];
    let source = '';
    try {
        if (sourceType === 'pdf' && pdfData) {
            text = await pdfToText(pdfData);
            source = 'Uploaded PDF';
        } else if (sourceType === 'image' && imageData) {
            images = [bufferToDataUrl(imageMime, Buffer.from(imageData))];
            source = 'Uploaded image';
        } else if (sourceType === 'image') {
            if (!url) return NextResponse.json({ error: 'Provide an image URL.' }, { status: 400 });
            const d = await fetchImageAsDataUrl(url);
            if (!d) return NextResponse.json({ error: 'Could not read that image URL.' }, { status: 422 });
            images = [d];
            source = `Image: ${url}`;
        } else {
            const target = url || conv.registrationUrl || conv.websiteUrl;
            if (!target) return NextResponse.json({ error: 'Provide a pricing/registration URL.' }, { status: 400 });
            const g = await gatherFromUrl(target);
            text = g.text; images = g.images;
            source = `${g.kind.toUpperCase()}: ${target}`;
        }
    } catch (e: any) {
        return NextResponse.json({ error: `Could not read the source: ${e?.message || e}` }, { status: 502 });
    }

    if (!text.trim() && !images.length) {
        return NextResponse.json({ error: 'Couldn\'t read that source. Try a different page, a PDF, or the pricing image.' }, { status: 422 });
    }

    // ── extract: text first, image(s) as fallback ──
    let pricing = null;
    try {
        if (text.trim()) pricing = await extractPricingFromText(text, { apiKey, model });
        if ((!pricing || !pricing.tables.length) && images.length) {
            const fromImg = await extractPricingFromImages(images, { apiKey, model });
            if (fromImg.tables.length || !pricing) pricing = fromImg;
            if (fromImg.tables.length) source += ' (read from image)';
        }
    } catch (e: any) {
        console.error('scrape-pricing failed:', e?.message || e);
        return NextResponse.json({ error: 'The helper couldn\'t read that source. Try a different page, PDF, or image.' }, { status: 502 });
    }

    if (!pricing || !pricing.tables.length) {
        const likelyJsApp = !images.length && text.trim().length < 1500;
        return NextResponse.json({
            error: likelyJsApp
                ? 'We couldn\'t read any prices from that page. Many ticketing sites (OvationTix, Eventbrite, etc.) build their price tables with JavaScript that this tool can\'t see. Take a screenshot of the pricing and use the Image option — you can paste it straight from your clipboard.'
                : 'Couldn\'t find a price table in that source. Try the registration/tickets page or a clearer image.',
        }, { status: 422 });
    }

    return NextResponse.json({ success: true, source, currency: pricing.currency, tables: pricing.tables });
}
