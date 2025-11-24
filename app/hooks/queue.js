import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useQueueContext } from '../context/QueueContext';
import sdAPI from '../utils/sd-api';
import debug from '../utils/debug';
import { getAblyRealtime } from '../lib/ably';

/**
 * Hook to poll SD API jobs endpoint and keep queue count in sync.
 * The SD API is the single source of truth for queue status.
 * Also subscribes to real-time queue events from other devices.
 */
export function useQueue() {
    const { dispatch, actions } = useApp();
    const { setCount } = useQueueContext();
    const pollerRef = useRef(null);
    const isPollingRef = useRef(false);

    const getJobCount = useCallback(async () => {
        try {
            const jobs = await sdAPI.getJobs();
            let count = 0;

            // Parse the response to get the job count
            if (Array.isArray(jobs)) {
                count = jobs.length;
            } else if (jobs && typeof jobs === 'object') {
                if (Array.isArray(jobs.jobs)) count = jobs.jobs.length;
                else if (Array.isArray(jobs.queue)) count = jobs.queue.length;
                else if (typeof jobs.count === 'number') count = jobs.count;
            }

            return count;
        } catch (err) {
            debug.warn('SD-Queue', 'Failed to fetch jobs', err);
            return 0;
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (pollerRef.current) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
        }
        isPollingRef.current = false;
        dispatch({ type: actions.SET_GENERATING, payload: false });
        dispatch({ type: actions.SET_PROGRESS, payload: 0 });
        setCount(0);
    }, [dispatch, actions, setCount]);

    const startPolling = useCallback(() => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;

        const poll = async () => {
            try {
                const count = await getJobCount();

                // Update queue count in context
                setCount(count);

                // Update generating state based on whether there are jobs
                if (count > 0) {
                    dispatch({ type: actions.SET_GENERATING, payload: true });
                    dispatch({ type: actions.SET_PROGRESS, payload: 0 }); // Fixed at 0 as requested
                } else {
                    // Queue is empty, stop polling
                    stopPolling();
                }
            } catch (err) {
                debug.warn('SD-Queue', 'Polling failed', err);
                stopPolling();
            }
        };

        // Poll immediately, then every 2 seconds
        poll();
        pollerRef.current = setInterval(poll, 2000);
    }, [dispatch, actions, stopPolling, getJobCount, setCount]);

    const triggerQueuePolling = useCallback(() => {
        // If already polling, do nothing
        if (isPollingRef.current) return;
        startPolling();
    }, [startPolling]);

    // Subscribe to real-time queue events from other devices
    useEffect(() => {
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('Queue-Realtime', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('queue');

        const onJobQueued = (payload) => {
            debug.log('Queue-Realtime', 'Received job_queued event', payload);

            // Another device queued a job, start polling to check for new jobs
            // Uses the SAME refs as the main polling logic
            triggerQueuePolling();
        };

        channel.subscribe('job_queued', onJobQueued);
        debug.log('Queue-Realtime', 'Subscribed to Ably channel #queue');

        return () => {
            try { channel.unsubscribe('job_queued', onJobQueued); } catch (_) { /* noop */ }
            try { realtime.channels.release('queue'); } catch (_) { /* noop */ }
        };
    }, [triggerQueuePolling]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (pollerRef.current) {
                clearInterval(pollerRef.current);
            }
        };
    }, []);

    return {
        triggerQueuePolling,
        isPolling: () => isPollingRef.current,
    };
}