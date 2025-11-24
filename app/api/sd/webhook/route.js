import { NextResponse } from 'next/server';
import { createServiceClient, saveGeneratedImage } from '@/app/lib/supabase-server';

export async function POST(request) {
    // Verify auth header – in this flow, the proxy sends back the per-job token
    const token = request.headers.get('x-webhook-key', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const supabase = createServiceClient();

        // Find pending job by webhook_auth_token (and match job_uuid when provided)
        let query = supabase.from('jobs')
            .select('*')
            .eq('webhook_auth_token', token)
            .eq('status', 'pending')
            .eq('job_uuid', body?.uuid);

        const { data: job, error: findErr } = await query.single();

        if (findErr || !job) {
            console.warn('[SD Webhook] Job not found for token/uuid.');
            return NextResponse.json({ ok: true });
        }

        // If proxy indicates failure, mark job failed
        const status = (body?.status || body?.state || 'succeeded').toLowerCase();
        if (status !== 'succeeded' && status !== 'completed') {
            await supabase
                .from('jobs')
                .update({ status: 'failed', error: body?.error || 'generation_failed', completed_at: new Date().toISOString() })
                .eq('id', job.id);
            return NextResponse.json({ ok: true });
        }

        // Gather images from common fields
        const images = body?.images || body?.output || body?.result?.images || [];
        if (!images || images.length === 0) {
            await supabase
                .from('jobs')
                .update({ status: 'failed', error: 'no_images', completed_at: new Date().toISOString() })
                .eq('id', job.id);
            return NextResponse.json({ ok: true });
        }

        // Persist each image using the same logic as /api/images
        const meta = {
            positivePrompt: job.payload?.positivePrompt,
            negativePrompt: job.payload?.negativePrompt,
            model: job.payload?.model,
            orientation: job.payload?.orientation,
            width: job.payload?.width,
            height: job.payload?.height,
            batchSize: job.payload?.batchSize,
            samplerName: job.payload?.samplerName,
            scheduler: job.payload?.scheduler,
            steps: job.payload?.steps,
            cfgScale: job.payload?.cfgScale,
            seed: job.payload?.seed,
            adetailerEnabled: job.payload?.adetailerEnabled,
            adetailerModel: job.payload?.adetailerModel,
            info: body?.info || job.payload?.info || {},
            folderId: job.payload?.folder_id || null,
            loras: job.payload?.loras || null
        };

        for (const img of images) {
            await saveGeneratedImage({
                supabase,
                userId: job.user_id,
                imageBase64: typeof img === 'string' ? img : img?.data || '',
                meta
            });
        }

        // Mark job as completed
        await supabase
            .from('jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[SD Webhook] Error handling payload:', error);
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }
}