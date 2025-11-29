// @ts-nocheck
/**
 * Stable Diffusion Async Proxy Adapter
 * Implements the same interface as the sync client but submits jobs to the
 * async proxy and returns a queued response. Results are delivered to the
 * webhook implemented under /api/sd/webhook.
 */

import debug from '../utils/debug';
import { Workflow } from '../context/QueueContext';

// Important: Next.js only inlines env vars when accessed via static references
// like process.env.NEXT_PUBLIC_*. Avoid dynamic lookups on the client.
const SD_API_URL = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SD_API_URL) || '';
const SD_API_AUTH = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SD_API_AUTH_TOKEN) || '';
const APP_URL = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_APP_URL) || '';
const SD_WEBHOOK_URL = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SD_WEBHOOK_URL) || '';

class StableDiffusionAsyncAdapter {
    baseUrl: string;
    authToken: string;
    appUrl: string;

    constructor() {
        this.baseUrl = SD_API_URL || '';
        this.authToken = SD_API_AUTH || '';
        this.appUrl = APP_URL || '';
    }

    setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    getWebhookUrl() {
        // If explicitly configured, prefer the provided webhook URL
        if (SD_WEBHOOK_URL && String(SD_WEBHOOK_URL).trim().length > 0) {
            return String(SD_WEBHOOK_URL).trim();
        }
        // Fallback: build from NEXT_PUBLIC_APP_URL
        // Example: https://your-app.com/api/sd/webhook
        return `${this.appUrl?.replace(/\/$/, '')}/api/sd/webhook`;
    }

    getAuthHeaders() {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
        return headers;
    }

    async submitJob(path: string, payload: any, withWebhook = true, timeout = 15000) {
        const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const { __webhookAuthToken, ...rest } = payload || {};
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(withWebhook ? {
                    ...rest,
                    webhookUrl: this.getWebhookUrl(),
                    webhookKey: __webhookAuthToken || this.authToken
                } : rest),
                signal: controller.signal
            } as any);
            clearTimeout(id);
            if (!(response as any).ok) {
                let msg = 'Async proxy request failed';
                try { const err = await (response as any).json(); msg = err.error || err.message || msg; } catch(_) {}
                throw new Error(msg);
            }
            const data = await (response as any).json();
            // Expecting at least a job id/queue token
            // Normalize a minimal response shape the app can detect
            return {
                queued: true,
                jobId: (data as any).jobId || (data as any).id || (data as any).uuid || null,
                proxy: 'automatic1111-async-api-proxy',
                raw: data
            };
        } catch (error: any) {
            clearTimeout(id);
            debug.error('SD-API-ASYNC', 'submitJob error', { path, error: error.message });
            throw error;
        }
    }

    // For list/set models we can pass-through to proxy if supported; otherwise return simple stubs
    async getModels() {
        // Some proxies forward to A1111; attempt passthrough if available
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/sd-models`, { headers: this.getAuthHeaders() } as any);
            if ((resp as any).ok) return await (resp as any).json();
        } catch (_) {}
        return [];
    }

    async setModel(modelName: string) {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/options`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ sd_model_checkpoint: modelName })
            } as any);
            if ((resp as any).ok) return await (resp as any).json();
        } catch (_) {}
        return { success: false } as any;
    }

    async getProgress() {
        // Not applicable; async handled via webhook; return a neutral object
        return { queued: true };
    }

    // Assets API
    async getAssets() {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/assets`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            } as any);
            if ((resp as any).ok) {
                const data = await (resp as any).json();
                return Array.isArray(data) ? data : [];
            }
        } catch (_) {}
        return [];
    }

    async updateAsset(id: string, patch: any) {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/assets/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(patch || {})
            } as any);
            if ((resp as any).ok) {
                return await (resp as any).json();
            } else {
                let msg = 'Failed to update asset';
                try { const err = await (resp as any).json(); msg = err.error || err.message || msg; } catch(_) {}
                return { success: false, error: msg } as any;
            }
        } catch (e: any) {
            return { success: false, error: e?.message || 'Failed to update asset' } as any;
        }
    }

    async skip() {
        // Optional: implement cancel endpoint if needed in future
        return { queued: true };
    }

    async getJobs() {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/jobs`, { headers: this.getAuthHeaders() } as any);
            if ((resp as any).ok) return await (resp as any).json();
        } catch (_) {}
        return [];
    }

    async getWorkflows(): Promise<Workflow[]> {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/workflows`, { headers: this.getAuthHeaders() } as any);
            if ((resp as any).ok) return await (resp as any).json();
        } catch (_) {}
        return [];
    }

    async deleteJob(jobId: string) {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/jobs/${jobId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            } as any);
            return { success: (resp as any).status === 204, status: (resp as any).status } as any;
        } catch (error: any) {
            debug.error('SD-API-ASYNC', 'deleteJob error', { jobId, error: error.message });
            return { success: false, error: error.message } as any;
        }
    }

    async generateImage(params: any) {
        const payload = this.#mapTxt2ImgParams(params);
        // Proxy path: /sdapi/v1/txt2img
        return this.submitJob('/sdapi/v1/txt2img', payload);
    }

    async generateImageFromImage(params: any) {
        const payload = this.#mapImg2ImgParams(params);
        return this.submitJob('/sdapi/v1/img2img', payload);
    }

    async inpaintImage(params: any) {
        // In many setups inpaint is also img2img with mask
        const payload = this.#mapImg2ImgParams(params);
        return this.submitJob('/sdapi/v1/img2img', payload);
    }

    // Private helpers to keep payload close to A1111 schema
    #normalizeBase64(b64?: string) {
        if (!b64) return b64 as any;
        const commaIdx = b64.indexOf(',');
        if (b64.startsWith('data:') && commaIdx !== -1) return b64.substring(commaIdx + 1);
        return b64;
    }

    #addADetailer(payload: any, models?: string[]) {
        if (models && models.length > 0) {
            const args: any[] = [true, false, ...models.filter(Boolean).map(m => ({ ad_model: m }))];
            payload.alwayson_scripts = {
                ADetailer: { args }
            };
        }
        return payload;
    }

    #mapTxt2ImgParams({
        prompt,
        negativePrompt = '',
        width = 512,
        height = 512,
        batchSize = 1,
        samplerName = 'Euler a',
        scheduler = 'Automatic',
        steps = 20,
        cfgScale = 7,
        seed = -1,
        adetailerModels = null,
        __webhookAuthToken = undefined
    }: any) {
        const payload: any = {
            prompt,
            negative_prompt: negativePrompt,
            width,
            height,
            batch_size: batchSize,
            sampler_name: samplerName,
            scheduler,
            steps,
            cfg_scale: cfgScale,
            seed,
            __webhookAuthToken
        };
        const models = Array.isArray(adetailerModels) && adetailerModels.length > 0 ? adetailerModels : [];
        return this.#addADetailer(payload, models as any);
    }

    #mapImg2ImgParams({
        initImage,
        maskImage = null,
        prompt,
        negativePrompt = '',
        width = 512,
        height = 512,
        batchSize = 1,
        samplerName = 'Euler a',
        scheduler = 'Automatic',
        steps = 20,
        cfgScale = 7,
        seed = -1,
        denoisingStrength = 0.5,
        adetailerModels = null,
        __webhookAuthToken = undefined
    }: any) {
        // Allow object inputs shaped like { base64: string }
        const extract = (val: any) => {
            if (!val) return null;
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && (val as any).base64) return (val as any).base64;
            return null;
        };

        const initB64 = this.#normalizeBase64(extract(initImage) as any);
        const maskB64 = this.#normalizeBase64(extract(maskImage) as any);

        const payload: any = {
            init_images: [initB64],
            prompt,
            negative_prompt: negativePrompt,
            width,
            height,
            batch_size: batchSize,
            sampler_name: samplerName,
            scheduler,
            steps,
            cfg_scale: cfgScale,
            seed,
            denoising_strength: denoisingStrength,
            __webhookAuthToken
        };
        if (maskB64) payload.mask = maskB64;
        const models = Array.isArray(adetailerModels) && adetailerModels.length > 0 ? adetailerModels : [];
        return this.#addADetailer(payload, models as any);
    }
}

export default StableDiffusionAsyncAdapter;
