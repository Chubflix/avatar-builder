import { NextResponse } from 'next/server';
import { createServiceClient, uploadImageWithService } from '@/app/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

const getEnv = (key, fallback = undefined) => {
    try {
        return typeof process !== 'undefined' && process.env ? (process.env[key] ?? fallback) : fallback;
    } catch (_) {
        return fallback;
    }
};

export async function POST(request) {
    // Verify auth header – in this flow, the proxy sends back the per-job token
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = (authHeader || '').startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const supabase = createServiceClient();

        // Find pending job by webhook_auth_token
        const { data: job, error: findErr } = await supabase
            .from('jobs')
            .select('*')
            .eq('webhook_auth_token', token)
            .eq('status', 'pending')
            .single();

        if (findErr || !job) {
            console.warn('[SD Webhook] Job not found for token.');
            return NextResponse.json({ ok: true });
        }

        // Determine success/failure and extract image(s)
        const status = (body?.status || body?.state || 'succeeded').toLowerCase();
        if (status !== 'succeeded' && status !== 'completed') {
            // Mark failed with error if provided
            await supabase
                .from('jobs')
                .update({ status: 'failed', error: body?.error || 'generation_failed', completed_at: new Date().toISOString() })
                .eq('id', job.id);
            return NextResponse.json({ ok: true });
        }

        const images = body?.images || body?.output || body?.result?.images || [];
        if (!images || images.length === 0) {
            // No images in payload – mark failed
            await supabase
                .from('jobs')
                .update({ status: 'failed', error: 'no_images', completed_at: new Date().toISOString() })
                .eq('id', job.id);
            return NextResponse.json({ ok: true });
        }

        const first = images[0];
        // Normalize base64 (may be data URL)
        const base64 = typeof first === 'string' ? (first.includes(',') ? first.split(',')[1] : first) : null;
        if (!base64) {
            await supabase
                .from('jobs')
                .update({ status: 'failed', error: 'invalid_image_format', completed_at: new Date().toISOString() })
                .eq('id', job.id);
            return NextResponse.json({ ok: true });
        }

        const buffer = Buffer.from(base64, 'base64');
        const id = uuidv4();
        const filename = `${id}.png`;
        const storagePath = `${job.user_id}/${filename}`;

        // Upload to storage using service client to bypass RLS
        await uploadImageWithService(new Blob([buffer], { type: 'image/png' }), storagePath);

        // Mark job as completed and store storage_path
        await supabase
            .from('jobs')
            .update({ status: 'completed', storage_path: storagePath, completed_at: new Date().toISOString() })
            .eq('id', job.id);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[SD Webhook] Error handling payload:', error);
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }
}