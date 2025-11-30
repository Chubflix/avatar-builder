// @ts-nocheck
/**
 * Queue notification utilities using Ably real-time messaging
 * Broadcasts when jobs are queued so other devices can start polling
 *
 * Events are published server-side via API to avoid client permission issues
 */

import debug from './debug';
import {notifyQueue} from "@/actions/queue";

/**
 * Publish a queue event to notify other devices
 * Uses server-side API to publish with proper Ably permissions
 * @param {string} eventType - Type of event ('job_queued', 'job_completed', etc.)
 * @param {object} data - Event data
 */
export async function publishQueueEvent(eventType: string, data: Record<string, any> = {}) {
    try {
        await notifyQueue({
            eventType: eventType,
            data: { data }
        })
        debug.log('Queue-Notifications', `Published ${eventType}`, data);
    } catch (err) {
        // Non-fatal, just log
        debug.warn('Queue-Notifications', `Failed to publish ${eventType}`, err);
    }
}

/**
 * Convenience function to notify that a job was queued
 * @param {string} jobId - Job ID
 */
export async function notifyJobQueued(jobId: string) {
    // Fire and forget - don't await
    return publishQueueEvent('job_queued', { jobId });
}
