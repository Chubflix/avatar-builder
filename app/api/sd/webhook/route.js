import { NextResponse } from 'next/server';
import { createServiceClient, saveGeneratedImage } from '@/app/lib/supabase-server';
import { getImageUrl } from '@/app/lib/s3-server';
import { publishRealtimeEvent } from '@/app/lib/ably';

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

        // Derive generation metadata from job payload
        const inferredType = job.payload?.generation_type
            || (job.payload?.mask_id ? 'inpaint' : (job.payload?.initImage ? 'img2img' : 'txt2img'));
        const parentImageId = job.payload?.parent_image_id || null;
        const resolvedMaskId = job.payload?.mask_id || null;

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
            seed: body.seed || job.payload?.seed,
            adetailerEnabled: job.payload?.adetailerEnabled,
            adetailerModel: job.payload?.adetailerModel,
            info: body?.info || job.payload?.info || {},
            folderId: job.payload?.folder_id || null,
            loras: job.payload?.loras || null,
            generationType: inferredType,
            parentImageId,
            maskId: resolvedMaskId,
            tags: body?.tags || []
        };

        const savedImages = [];
        for (const [index, img] of images.entries()) {
            let perMaskId = meta.maskId || null;
            const saved = await saveGeneratedImage({
                supabase,
                userId: job.user_id,
                imageBase64: typeof img === 'string' ? img : img?.data || '',
                meta: { ...meta, maskId: perMaskId, seed: meta.seed ? (Number(meta.seed) + index) : null }
            });
            if (saved) savedImages.push(saved);
        }

        // Mark job as completed
        await supabase
            .from('jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

        await updateChatMessge(job, savedImages);

        return NextResponse.json({ ok: true, images: (savedImages || []).map(i => ({ id: i.id, url: getImageUrl(i.storage_path) || i.url })) });
    } catch (error) {
        console.error('[SD Webhook] Error handling payload:', error);
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }
}

async function updateChatMessge(job, savedImages) {
    const supabase = createServiceClient();

    // Update chat message if this job was triggered from chat
    try {
        // Find the chat message linked to this job (using job_uuid which is stored in metadata)
        const { data: msg, error: msgErr } = await supabase
            .from('chat_messages')
            .select('id, content, metadata')
            .eq('metadata->>jobId', job.job_uuid)
            .eq('user_id', job.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!msg || msgErr) {
            console.log('[SD Webhook] No chat message found for job:', job.job_uuid);
        } else {
            // Build images array to attach
            const newImages = (savedImages || []).map((img) => ({
                id: img.id,
                url: getImageUrl(img.storage_path) || img.url || null,
            })).filter(x => x && x.id && x.url);

            // Merge existing metadata
            const existingMeta = (msg.metadata && typeof msg.metadata === 'object') ? msg.metadata : {};
            const prevImages = Array.isArray(existingMeta.images) ? existingMeta.images : [];
            const mergedById = new Map();
            for (const it of [...prevImages, ...newImages]) {
                if (it?.id) mergedById.set(it.id, it);
            }
            const mergedImages = Array.from(mergedById.values());

            const updatedMeta = {
                ...existingMeta,
                generation_complete: true,
                images: mergedImages,
            };

            const alreadyHasNote = typeof msg.content === 'string' && msg.content.includes('Image was successfully created');
            const newContent = alreadyHasNote ? msg.content : `${msg.content || ''}\n\n**Image was successfully created ✅**`;

            const { data: updated, error: upErr } = await supabase
                .from('chat_messages')
                .update({
                    content: newContent,
                    metadata: updatedMeta,
                })
                .eq('id', msg.id)
                .select('id')
                .single();

            // Realtime publish so chat can update if visible
            try {
                await publishRealtimeEvent('chat-messages', 'message_updated', {
                    message_id: msg.id,
                    user_id: job.user_id,
                    job_id: job.id,
                    images: newImages,
                    generation_complete: true,
                });
            } catch (e) {
                console.warn('[Realtime] Failed to publish chat message update:', e?.message || e);
            }

            if (upErr) {
                console.warn('[SD Webhook] Failed to update chat message metadata:', upErr?.message);
            }
        }
    } catch (error) {
        // Silently fail if no chat message found (job might not be from chat)
        console.log('[SD Webhook] No chat message found for job:', job.job_uuid);
    }
}