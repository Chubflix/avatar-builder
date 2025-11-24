/**
 * Stable Diffusion Async Proxy Adapter
 * Implements the same interface as the sync client but submits jobs to the
 * async proxy and returns a queued response. Results are delivered to the
 * webhook implemented under /api/sd/webhook.
 */

import debug from '../utils/debug';

// Important: Next.js only inlines env vars when accessed via static references
// like process.env.NEXT_PUBLIC_*. Avoid dynamic lookups on the client.
const SD_API_URL = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SD_API_URL) || '';
const SD_API_AUTH = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SD_API_AUTH_TOKEN) || '';
const APP_URL = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL) || '';

class StableDiffusionAsyncAdapter {
    constructor() {
        this.baseUrl = SD_API_URL || '';
        this.authToken = SD_API_AUTH || '';
        this.appUrl = APP_URL || '';
    }

    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }

    getWebhookUrl() {
        // Publicly reachable URL for the proxy to call
        // Example: https://your-app.com/api/sd/webhook
        return `${this.appUrl?.replace(/\/$/, '')}/api/sd/webhook`;
    }

    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
        return headers;
    }

    async submitJob(path, payload, timeout = 15000) {
        const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const { __webhookAuthToken, ...rest } = payload || {};
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...rest,
                    webhookUrl: this.getWebhookUrl(),
                    webhookKey: __webhookAuthToken || this.authToken
                }),
                signal: controller.signal
            });
            clearTimeout(id);
            if (!response.ok) {
                let msg = 'Async proxy request failed';
                try { const err = await response.json(); msg = err.error || err.message || msg; } catch(_) {}
                throw new Error(msg);
            }
            const data = await response.json();
            // Expecting at least a job id/queue token
            // Normalize a minimal response shape the app can detect
            return {
                queued: true,
                jobId: data.jobId || data.id || data.uuid || null,
                proxy: 'automatic1111-async-api-proxy',
                raw: data
            };
        } catch (error) {
            clearTimeout(id);
            debug.error('SD-API-ASYNC', 'submitJob error', { path, error: error.message });
            throw error;
        }
    }

    // For list/set models we can pass-through to proxy if supported; otherwise return simple stubs
    async getModels() {
        // Some proxies forward to A1111; attempt passthrough if available
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/sd-models`, { headers: this.getAuthHeaders() });
            if (resp.ok) return await resp.json();
        } catch (_) {}
        return [];
    }

    async setModel(modelName) {
        try {
            const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/sdapi/v1/options`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ sd_model_checkpoint: modelName })
            });
            if (resp.ok) return await resp.json();
        } catch (_) {}
        return { success: false };
    }

    async getProgress() {
        // Not applicable; async handled via webhook; return a neutral object
        return { queued: true };
    }

    async skip() {
        // Optional: implement cancel endpoint if needed in future
        return { queued: true };
    }

    async generateImage(params) {
        const payload = this.#mapTxt2ImgParams(params);
        // Proxy path: /sdapi/v1/txt2img
        return this.submitJob('/sdapi/v1/txt2img', payload);
    }

    async generateImageFromImage(params) {
        const payload = this.#mapImg2ImgParams(params);
        return this.submitJob('/sdapi/v1/img2img', payload);
    }

    async inpaintImage(params) {
        // In many setups inpaint is also img2img with mask
        const payload = this.#mapImg2ImgParams(params);
        return this.submitJob('/sdapi/v1/img2img', payload);
    }

    // Private helpers to keep payload close to A1111 schema
    #normalizeBase64(b64) {
        if (!b64) return b64;
        const commaIdx = b64.indexOf(',');
        if (b64.startsWith('data:') && commaIdx !== -1) return b64.substring(commaIdx + 1);
        return b64;
    }

    #addADetailer(payload, enabled, model) {
        if (enabled && model) {
            payload.alwayson_scripts = {
                ADetailer: {
                    args: [ true, false, { ad_model: model } ]
                }
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
        adetailerEnabled = false,
        adetailerModel = null,
        __webhookAuthToken = undefined
    }) {
        const payload = {
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
        return this.#addADetailer(payload, adetailerEnabled, adetailerModel);
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
        adetailerEnabled = false,
        adetailerModel = null,
        __webhookAuthToken = undefined
    }) {
        const payload = {
            init_images: [this.#normalizeBase64(initImage)],
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
        if (maskImage) payload.mask = this.#normalizeBase64(maskImage);
        return this.#addADetailer(payload, adetailerEnabled, adetailerModel);
    }
}

export default StableDiffusionAsyncAdapter;
