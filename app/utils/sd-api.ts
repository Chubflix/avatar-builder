// @ts-nocheck
/**
 * Stable Diffusion API Client (Async-only)
 * This project now exclusively supports the async proxy adapter.
 */

import AsyncAdapter from './sd-api-async';

// Important: Next.js only inlines env vars when accessed via static references
// like process.env.NEXT_PUBLIC_*. Avoid dynamic lookups on the client.
const SD_API_URL = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SD_API_URL) || '';

const sdAPI = new AsyncAdapter();
if (SD_API_URL) {
    sdAPI.setBaseUrl(SD_API_URL);
}

export default sdAPI;
