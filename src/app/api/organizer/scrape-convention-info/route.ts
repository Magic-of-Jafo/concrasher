import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOpenAIConfig } from '@/lib/ai-settings';
import {
    gatherFromUrl,
    fetchImageAsDataUrl,
    bufferToDataUrl,
    pdfToText,
    extractBasicInfoFromText,
    extractBasicInfoFromImages,
} from '@/lib/scheduleScraper';

// POST /api/organizer/scrape-convention-info
// Organizer/admin tool: read a convention's basic listing info (name, dates,
// location, description, links) from a URL / PDF / image and return the fields
// for the editor form to populate. Preview-only — no DB write, no convention id
// (so it also works while creating a brand-new convention).
//
// JSON body:      { source: { type: 'url'|'image', url?: string } }
// multipart form: pdf=<file> | image=<file>, sourceType=pdf|image
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const roles = (session.user as any).roles || [];
    if (!roles.includes('ORGANIZER') && !roles.includes('ADMIN')) {
        return NextResponse.json({ error: 'You must be an organizer or admin.' }, { status: 403 });
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
            if (!url) return NextResponse.json({ error: 'Provide a URL.' }, { status: 400 });
            const g = await gatherFromUrl(url);
            text = g.text; images = g.images;
            source = `${g.kind.toUpperCase()}: ${url}`;
        }
    } catch (e: any) {
        return NextResponse.json({ error: `Could not read the source: ${e?.message || e}` }, { status: 502 });
    }

    if (!text.trim() && !images.length) {
        return NextResponse.json({ error: 'Couldn\'t read that source. Try a different page, a PDF, or an image.' }, { status: 422 });
    }

    // ── extract: text first, image(s) as fallback ──
    let info = null;
    try {
        if (text.trim()) info = await extractBasicInfoFromText(text, { apiKey, model });
        if ((!info || !info.name) && images.length) {
            const fromImg = await extractBasicInfoFromImages(images, { apiKey, model });
            if (fromImg.name || !info) info = fromImg;
            if (fromImg.name) source += ' (read from image)';
        }
    } catch (e: any) {
        console.error('scrape-convention-info failed:', e?.message || e);
        return NextResponse.json({ error: 'The helper couldn\'t read that source. Try a different page, PDF, or image.' }, { status: 502 });
    }

    if (!info || !info.name) {
        const likelyJsApp = !images.length && text.trim().length < 1500;
        return NextResponse.json({
            error: likelyJsApp
                ? 'We couldn\'t read details from that page. Some event sites load their content with JavaScript that this tool can\'t see. Take a screenshot of the page and use the Image option — you can paste it straight from your clipboard.'
                : 'Couldn\'t find convention details in that source. Try the event\'s main page or a clearer image.',
        }, { status: 422 });
    }

    return NextResponse.json({ success: true, source, info });
}
