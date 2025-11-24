/**
 * Stable Diffusion API Client
 * Handles all communication with the Stable Diffusion WebUI API
 */

import debug from '../utils/debug';
import AsyncAdapter from './sd-api-async';

// Important: Next.js only inlines env vars when accessed via static references
// like process.env.NEXT_PUBLIC_*. Avoid dynamic lookups on the client.
const SD_API_URL = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SD_API_URL) || '';


// Feature flag to optionally use the async proxy adapter
const USE_ASYNC_PROXY =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SD_API_USES_ASYNC_PROXY)
        ? String(process.env.NEXT_PUBLIC_SD_API_USES_ASYNC_PROXY).toLowerCase() === 'true'
        : false;

const ASYNC_ENABLED = USE_ASYNC_PROXY && !!AsyncAdapter;

class StableDiffusionAPI {
    constructor() {
        this.baseUrl = SD_API_URL;
    }

    /**
     * Set the base URL for the API
     */
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Fetch with timeout
     */
    async fetchWithTimeout(url, options = {}, timeout = 10000) {
        debug.log('SD-API', 'Starting fetch', { url, timeout });
        const controller = new AbortController();
        const id = setTimeout(() => {
            debug.warn('SD-API', 'Request timeout, aborting', { url });
            controller.abort();
        }, timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            debug.log('SD-API', 'Fetch completed', { url, status: response.status });
            clearTimeout(id);
            return response;
        } catch (error) {
            debug.error('SD-API', 'Fetch failed', { url, error: error.message });
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Get list of available models
     */
    async getModels() {
        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/sd-models`);
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        debug.log('SD-API', 'Models parsed', { count: data.length });
        return data;
    }

    /**
     * Set the active model
     */
    async setModel(modelName) {
        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sd_model_checkpoint: modelName
            })
        });

        if (!response.ok) {
            throw new Error('Failed to set model');
        }

        return await response.json();
    }

    /**
     * Get current generation progress
     */
    async getProgress() {
        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/progress?skip_current_image=true`, {}, 5000);
        if (!response.ok) {
            throw new Error('Failed to fetch progress');
        }
        return await response.json();
    }

    /**
     * Skip current generation
     */
    async skip() {
        debug.log('SD-API', 'Skipping current generation');
        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/skip`, {
            method: 'POST'
        }, 5000);
        if (!response.ok) {
            debug.warn('SD-API', 'Skip request failed', { status: response.status });
            throw new Error('Failed to skip generation');
        }
        debug.log('SD-API', 'Skip successful');
        return await response.json();
    }

    /**
     * Generate images using txt2img
     */
    async generateImage({
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
                            adetailerModel = null
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
            seed
        };

        // Add ADetailer if enabled
        if (adetailerEnabled && adetailerModel) {
            payload.alwayson_scripts = {
                ADetailer: {
                    args: [
                        true,
                        false,
                        {
                            ad_model: adetailerModel
                        }
                    ]
                }
            };
        }

        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, 300000); // 5 minutes timeout for generation

        if (!response.ok) {
            throw new Error('Image generation failed');
        }

        return await response.json();
    }

    /**
     * Generate images using img2img (image-to-image)
     *
     * Params:
     * - initImage: base64 string of the source image (may include data URL prefix)
     * - maskImage: optional base64 string of the mask image (white = keep/or paint area depending on mode)
     * - denoisingStrength: how strongly to transform the source image (0..1)
     * - other params mirror generateImage
     */
    async generateImageFromImage({
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
                                    adetailerModel = null
                                }) {
        if (!initImage) {
            throw new Error('initImage is required for img2img');
        }

        // Helper to strip data URL prefixes if present
        const normalizeBase64 = (b64) => {
            if (!b64) return b64;
            const commaIdx = b64.indexOf(',');
            if (b64.startsWith('data:') && commaIdx !== -1) {
                return b64.substring(commaIdx + 1);
            }
            // Some SD UIs accept with prefix, but we normalize to raw base64
            return b64;
        };

        const payload = {
            init_images: [normalizeBase64(initImage)],
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
            denoising_strength: denoisingStrength
        };

        if (maskImage) {
            payload.mask = normalizeBase64(maskImage);
        }

        // Add ADetailer if enabled (mirrors txt2img usage)
        if (adetailerEnabled && adetailerModel) {
            payload.alwayson_scripts = {
                ADetailer: {
                    args: [
                        true,
                        false,
                        {
                            ad_model: adetailerModel
                        }
                    ]
                }
            };
        }

        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/img2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, 300000); // 5 minutes timeout for generation

        if (!response.ok) {
            throw new Error('Image-to-image generation failed');
        }

        return await response.json();
    }

    /**
     * Inpaint using an init image and a mask
     * White areas in the mask are repainted; black areas are preserved.
     * This uses the same /sdapi/v1/img2img endpoint with a mask payload.
     */
    async inpaintImage({
                           initImage,
                           maskImage,
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
                           adetailerModel = null
                       }) {
        if (!initImage) throw new Error('initImage is required for inpaint');
        if (!maskImage) throw new Error('maskImage is required for inpaint');

        const normalizeBase64 = (b64) => {
            if (!b64) return b64;
            const commaIdx = b64.indexOf(',');
            if (b64.startsWith('data:') && commaIdx !== -1) {
                return b64.substring(commaIdx + 1);
            }
            return b64;
        };

        const payload = {
            init_images: [normalizeBase64(initImage)],
            mask: normalizeBase64(maskImage),
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
            // Sensible defaults; keep minimal to avoid breaking
            inpainting_fill: 1, // original
            inpaint_full_res: true,
            inpaint_full_res_padding: 0,
            inpainting_mask_invert: 0
        };

        if (adetailerEnabled && adetailerModel) {
            payload.alwayson_scripts = {
                ADetailer: {
                    args: [
                        true,
                        false,
                        {
                            ad_model: adetailerModel
                        }
                    ]
                }
            };
        }

        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/img2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, 300000);

        if (!response.ok) {
            throw new Error('Inpaint generation failed');
        }

        return await response.json();
    }
}

// Create singleton instance. If async proxy flag is enabled and adapter is available, use it.
const sdAPI = ASYNC_ENABLED ? new AsyncAdapter() : new StableDiffusionAPI();

export default sdAPI;