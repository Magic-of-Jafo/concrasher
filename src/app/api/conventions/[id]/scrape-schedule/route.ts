import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOpenAIConfig } from '@/lib/ai-settings';
import {
    extractScheduleFromText,
    extractScheduleFromImages,
    findScheduleFromWebsite,
    gatherFromUrl,
    fetchImageAsDataUrl,
    bufferToDataUrl,
    pdfToText,
    applyScrapedSchedule,
    extractFestivalFromText,
    extractFestivalFromImages,
    applyScrapedFestival,
} from '@/lib/scheduleScraper';

// POST /api/conventions/[id]/scrape-schedule
// Organizer/admin tool: read a schedule from a URL, the convention website, or a
// PDF, extract events with AI, and either preview them or write them.
//
// JSON body:      { mode: 'preview'|'apply', replace?: boolean, source: { type:'url'|'website'|'pdf', url?: string } }
// multipart form: pdf=<file>, mode, replace, sourceType=pdf   (for PDF uploads)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conventionId = params.id;
    const conv = await prisma.convention.findUnique({
        where: { id: conventionId },
        select: { id: true, name: true, type: true, startDate: true, websiteUrl: true, series: { select: { organizerUserId: true } } },
    });
    if (!conv) return NextResponse.json({ error: 'Convention not found' }, { status: 404 });

    const isAdmin = (session.user as any).roles?.includes('ADMIN');
    const isOwner = conv.series?.organizerUserId === session.user.id;
    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'You must be the organizer or an admin for this convention.' }, { status: 403 });
    }

    const festival = conv.type === 'FESTIVAL';
    // Festivals carry their own dates in the programme and the helper sets them
    // on apply; regular schedules are anchored to a pre-set start date.
    if (!festival && !conv.startDate) {
        return NextResponse.json({ error: "Set the convention's start date first — the schedule is anchored to it." }, { status: 400 });
    }
    const festivalYear = conv.startDate ? new Date(conv.startDate).getUTCFullYear() : new Date().getUTCFullYear();

    // ── parse input (JSON, or multipart for PDF / image upload) ──
    let mode = 'preview', replace = true, sourceType = 'url', url = '';
    let pdfData: ArrayBuffer | null = null;
    let imageData: ArrayBuffer | null = null;
    let imageMime = 'image/jpeg';
    let providedSchedule: any = null;
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
        const form = await req.formData();
        mode = String(form.get('mode') || 'preview');
        replace = String(form.get('replace') ?? 'true') === 'true';
        sourceType = String(form.get('sourceType') || 'pdf');
        url = String(form.get('url') || '');
        const pdf = form.get('pdf');
        if (pdf && typeof pdf !== 'string') pdfData = await pdf.arrayBuffer();
        const image = form.get('image');
        if (image && typeof image !== 'string') { imageData = await image.arrayBuffer(); imageMime = image.type || 'image/jpeg'; }
    } else {
        const body = await req.json().catch(() => ({}));
        mode = body.mode || 'preview';
        replace = body.replace ?? true;
        sourceType = body.source?.type || 'url';
        url = body.source?.url || '';
        providedSchedule = body.schedule || null;
    }

    // Apply the already-previewed result directly (no re-extraction / drift).
    if (mode === 'apply' && providedSchedule) {
        if (festival && Array.isArray(providedSchedule.shows)) {
            const summary = await applyScrapedFestival(conventionId, providedSchedule, { replace });
            return NextResponse.json({ success: true, applied: true, summary, source: 'confirmed preview' });
        }
        if (!festival && Array.isArray(providedSchedule.events)) {
            const summary = await applyScrapedSchedule(conventionId, providedSchedule, { replace });
            return NextResponse.json({ success: true, applied: true, summary, source: 'confirmed preview' });
        }
    }

    const { apiKey, model } = await getOpenAIConfig();
    if (!apiKey) {
        return NextResponse.json({ error: 'The Schedule Helper isn\'t configured. Please contact the site administrator.' }, { status: 400 });
    }

    // ── acquire source: text and/or images, auto-detecting per source ──
    // A URL is sniffed (PDF / image / HTML); HTML also yields its prominent
    // images as a vision fallback so image-only or non-English schedules read.
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
        } else if (sourceType === 'website') {
            const target = url || conv.websiteUrl;
            if (!target) return NextResponse.json({ error: 'No website URL available for this convention.' }, { status: 400 });
            const r = await findScheduleFromWebsite(target);
            const g = await gatherFromUrl(r.chosenUrl);
            text = g.text; images = g.images;
            source = `Website (found: ${r.chosenUrl})`;
        } else {
            const target = url || conv.websiteUrl;
            if (!target) return NextResponse.json({ error: 'Provide a schedule URL.' }, { status: 400 });
            const g = await gatherFromUrl(target);
            text = g.text; images = g.images;
            source = `${g.kind.toUpperCase()}: ${target}`;
        }
    } catch (e: any) {
        return NextResponse.json({ error: `Could not read the source: ${e?.message || e}` }, { status: 502 });
    }

    if (!text.trim() && !images.length) {
        return NextResponse.json({ error: 'We couldn\'t read anything from that page — its content is likely built with JavaScript (common for Wix, Squarespace, and Eventbrite), which this tool can\'t read directly. Take a screenshot of the schedule and use the Image option — you can paste it straight from your clipboard.' }, { status: 422 });
    }

    // ── festival branch: extract SHOWS with their performances ──
    // Try the page text first; if it has no shows, read the image(s) (vision).
    if (festival) {
        let result: { shows: any[] } = { shows: [] };
        try {
            if (text.trim()) result = await extractFestivalFromText(text, { festivalName: conv.name, year: festivalYear, apiKey, model });
            if (!result.shows.length && images.length) {
                result = await extractFestivalFromImages(images, { festivalName: conv.name, year: festivalYear, apiKey, model });
                if (result.shows.length) source += ' (read from image)';
            }
        } catch (e: any) {
            console.error('scrape-festival extraction failed:', e?.message || e);
            return NextResponse.json({ error: 'The Schedule Helper couldn\'t read that source. Try a different page, PDF, or image.' }, { status: 502 });
        }
        if (mode === 'apply') {
            const summary = await applyScrapedFestival(conventionId, result, { replace });
            return NextResponse.json({ success: true, applied: true, summary, source });
        }
        return NextResponse.json({ success: true, applied: false, festival: true, source, shows: result.shows });
    }

    // ── convention branch: text first, image(s) as fallback ──
    let schedule: { days: any[]; events: any[] } = { days: [], events: [] };
    try {
        if (text.trim()) schedule = await extractScheduleFromText(text, { conventionName: conv.name, startDate: conv.startDate!, apiKey, model });
        if (!schedule.events.length && images.length) {
            schedule = await extractScheduleFromImages(images, { conventionName: conv.name, startDate: conv.startDate!, apiKey, model });
            if (schedule.events.length) source += ' (read from image)';
        }
    } catch (e: any) {
        console.error('scrape-schedule extraction failed:', e?.message || e);
        return NextResponse.json({ error: 'The Schedule Helper couldn\'t read that source. Try a different page, PDF, or image.' }, { status: 502 });
    }

    if (mode === 'apply') {
        const summary = await applyScrapedSchedule(conventionId, schedule, { replace });
        return NextResponse.json({ success: true, applied: true, summary, source });
    }

    return NextResponse.json({
        success: true,
        applied: false,
        source,
        days: schedule.days,
        events: schedule.events,
    });
}
