/**
 * Stable Diffusion API Client
 * Handles all communication with the Stable Diffusion WebUI API
 */

import debug from '../utils/debug';

class StableDiffusionAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
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
        const response = await this.fetchWithTimeout(`${this.baseUrl}/sdapi/v1/progress`, {}, 5000);
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
}

// Create singleton instance
const sdAPI = new StableDiffusionAPI('');

export default sdAPI;