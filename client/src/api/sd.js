/**
 * Stable Diffusion API Client
 * Handles all communication with the Stable Diffusion WebUI API
 */

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
     * Get list of available models
     */
    async getModels() {
        const response = await fetch(`${this.baseUrl}/sdapi/v1/sd-models`);
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        return await response.json();
    }

    /**
     * Set the active model
     */
    async setModel(modelName) {
        const response = await fetch(`${this.baseUrl}/sdapi/v1/options`, {
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
        const response = await fetch(`${this.baseUrl}/sdapi/v1/progress`);
        if (!response.ok) {
            throw new Error('Failed to fetch progress');
        }
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

        const response = await fetch(`${this.baseUrl}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Image generation failed');
        }

        return await response.json();
    }
}

// Create singleton instance
const sdAPI = new StableDiffusionAPI('');

export default sdAPI;