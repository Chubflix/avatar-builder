/**
 * Queue notification utilities using Ably real-time messaging
 * Broadcasts when jobs are queued so other devices can start polling
 *
 * Events are published server-side via API to avoid client permission issues
 */

import debug from './debug';

/**
 * Publish a queue event to notify other devices
 * Uses server-side API to publish with proper Ably permissions
 * @param {string} eventType - Type of event ('job_queued', 'job_completed', etc.)
 * @param {object} data - Event data
 */
export async function publishQueueEvent(eventType, data = {}) {
    try {
        const response = await fetch('/api/queue/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType, data })
        });

        if (!response.ok) {
            const error = await response.json();
            debug.warn('Queue-Notifications', `Failed to publish ${eventType}`, error);
            return;
        }

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
export function notifyJobQueued(jobId) {
    // Fire and forget - don't await
    publishQueueEvent('job_queued', { jobId });
}
