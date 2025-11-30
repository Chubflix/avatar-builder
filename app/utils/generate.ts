import sdAPI from "@/app/utils/sd-api";
import {buildLoraPrompt} from "@/app/utils/lora-builder";
import {attachJobUuid, createJob} from "@/actions/jobs";
import {notifyJobQueued} from "@/app/utils/queue-notifications";
import {notifyQueue} from "@/actions/queue";

interface GenerateImageParams {
    config: any;
    positivePrompt: string;
    selectedModel: string;
    negativePrompt: string;
    orientation: string;
    batchSize: number;
    seed: number;
    selectedFolder?: string | null;
    characterId?: string | null;
    loraSliders: any;
    loraToggles: any;
    loraStyle: string;
    initImage?: string | { base64?: string } | null;
    denoisingStrength?: number;
    maskImage?: string | { base64?: string; id?: string } | null;
    onJobQueued?: (jobId: string) => void;
    onNotification?: (message: string, type: 'info' | 'error') => void;
    onError?: (error: string) => void;
}

export async function generateImage(params: GenerateImageParams): Promise<{ jobId?: string; success: boolean }> {
    const {
        config, positivePrompt, selectedModel, negativePrompt, orientation, batchSize, seed,
        selectedFolder, characterId, loraSliders, loraToggles, loraStyle,
        initImage, denoisingStrength = 0.5, maskImage, onJobQueued, onNotification, onError
    } = params;

    if (!positivePrompt.trim()) {
        onError?.('Please enter a positive prompt');
        return {success: false};
    }

    try {
        await sdAPI.setModel(selectedModel);
        const loraAdditions = buildLoraPrompt(config, loraSliders, loraToggles, loraStyle);
        const finalPrompt = positivePrompt + loraAdditions;

        const adList = Array.isArray(config.adetailer_list) ? config.adetailer_list : [];
        const enabledModels: string[] = adList
            .filter((i: any) => i?.enabled && typeof i.model === 'string' && i.model.trim())
            .map((i: any) => i.model.trim());

        let maskId = null;
        const initB64 = typeof initImage === 'string' ? initImage : (initImage?.base64 || null);
        const maskB64 = typeof maskImage === 'string' ? maskImage : (maskImage?.base64 || null);
        const maskIdInput = typeof maskImage === 'object' ? maskImage?.id || null : null;

        if (initB64 && maskB64) {
            try {
                // TODO: replace with server action
                const resp = await fetch('/api/masks', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id: maskIdInput || undefined, base64: maskB64})
                });
                if (resp.ok) {
                    const saved = await resp.json();
                    maskId = saved.id;
                }
            } catch (_) {
            }
        }

        const dims = config.dimensions[orientation];
        const jobPayload = {
            positivePrompt, negativePrompt, model: selectedModel, orientation,
            width: dims.width, height: dims.height, batchSize,
            samplerName: config.generation.samplerName,
            scheduler: config.generation.scheduler,
            steps: config.generation.steps,
            cfgScale: config.generation.cfgScale,
            seed,
            adetailerEnabled: enabledModels.length > 0,
            adetailerModel: enabledModels[0] || null,
            adetailerModels: enabledModels,
            folder_id: selectedFolder || null,
            character_id: characterId || null,
            loras: {sliders: loraSliders, toggles: loraToggles, style: loraStyle},
            generation_type: initB64 ? (maskB64 ? 'inpaint' : 'img2img') : 'txt2img',
            parent_image_id: null,
            mask_id: maskId || null,
        };

        let webhookToken = null;
        try {
            const job = await createJob(jobPayload);
            webhookToken = job.token;
        } catch (_) {
        }

        const result = initB64
            ? (maskB64
                ? await sdAPI.inpaintImage({
                    initImage: initB64, maskImage: maskB64, prompt: finalPrompt, negativePrompt,
                    width: dims.width, height: dims.height, batchSize,
                    samplerName: config.generation.samplerName, scheduler: config.generation.scheduler,
                    steps: config.generation.steps, cfgScale: config.generation.cfgScale, seed,
                    denoisingStrength, adetailerModels: enabledModels, __webhookAuthToken: webhookToken || undefined
                })
                : await sdAPI.generateImageFromImage({
                    initImage: initB64, prompt: finalPrompt, negativePrompt,
                    width: dims.width, height: dims.height, batchSize,
                    samplerName: config.generation.samplerName, scheduler: config.generation.scheduler,
                    steps: config.generation.steps, cfgScale: config.generation.cfgScale, seed,
                    denoisingStrength, adetailerModels: enabledModels, __webhookAuthToken: webhookToken || undefined
                }))
            : await sdAPI.generateImage({
                prompt: finalPrompt, negativePrompt,
                width: dims.width, height: dims.height, batchSize,
                samplerName: config.generation.samplerName, scheduler: config.generation.scheduler,
                steps: config.generation.steps, cfgScale: config.generation.cfgScale, seed,
                adetailerModels: enabledModels, __webhookAuthToken: webhookToken || undefined
            });

        if (result?.queued) {
            const jobId = result.jobId || result.raw?.id || 'unknown';
            if (webhookToken && jobId && jobId !== 'unknown') {
                try {
                    await attachJobUuid({token: webhookToken, job_uuid: jobId})
                } catch (_) {
                }
            }

            // Clean notification handling
            onNotification?.(`Job queued (ID: ${jobId})`, 'info');
            (onJobQueued) ? onJobQueued(jobId) : await notifyQueue('job_queued', { jobId });
            return {jobId, success: true};
        }
        return {success: true};
    } catch (err: any) {
        onError?.('Generation failed: ' + err.message);
        onNotification?.('Generation failed: ' + err.message, 'error');
        return {success: false};
    }
}