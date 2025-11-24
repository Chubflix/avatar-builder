import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useQueueContext } from '../context/QueueContext';
import sdAPI from '../utils/sd-api';
import debug from '../utils/debug';

/**
 * Hook to recover and show progress for pending async SD jobs on app load.
 * If there's a pending queue entry from the last 10 minutes, poll the sd-proxy
 * for queue size (sdAPI.getJobs()) and reflect progress in state (1 => 100%).
 */
export function useQueue() {
    const { dispatch, actions } = useApp();
    const { isProcessing, setProcessing } = useQueueContext();
    const pollerRef = useRef(null);
    const isPollingRef = useRef(false);
    const lastTriggerAtRef = useRef(0);
    const jobCountRef = useRef(0);

    const getJobs = useCallback(async () => {
        try {
            const jobs = await sdAPI.getJobs();
            let count = 0;
            if (Array.isArray(jobs)) count = jobs.length;
            else if (jobs && typeof jobs === 'object') {
                if (Array.isArray(jobs.jobs)) count = jobs.jobs.length;
                else if (Array.isArray(jobs.queue)) count = jobs.queue.length;
                else if (typeof jobs.count === 'number') count = jobs.count;
            }
            jobCountRef.current = count;
            return jobs;
        } catch (err) {
            debug.warn('SD-Queue', 'Failed to fetch jobs', err);
            jobCountRef.current = 0;
            return [];
        }
    }, []);

    const stopPolling = useCallback((finished = false) => {
        if (pollerRef.current) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
        }
        isPollingRef.current = false;
        if (finished) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Queue empty' } });
            setTimeout(() => {
                dispatch({ type: actions.SET_GENERATING, payload: false });
                dispatch({ type: actions.SET_PROGRESS, payload: 0 });
            }, 600);
        } else {
            dispatch({ type: actions.SET_GENERATING, payload: false });
            dispatch({ type: actions.SET_PROGRESS, payload: 0 });
        }
    }, [dispatch, actions]);

    const startPolling = useCallback(() => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        dispatch({ type: actions.SET_GENERATING, payload: true });
        dispatch({ type: actions.SET_STATUS, payload: { type: 'info', message: 'Checking generation queue…' } });

        const poll = async () => {
            try {
                // Refresh jobs each tick
                await getJobs();
                const count = jobCountRef.current;
                const percent = count > 0 ? Math.min(100, Math.max(1, Math.round(100 / count))) : 100;
                dispatch({ type: actions.SET_PROGRESS, payload: percent });
                // dispatch({ type: actions.SET_STATUS, payload: { type: 'info', message: `Queue: ${count}` } });
                if (count <= 0) {
                    // Grace period after a fresh trigger to allow the async proxy
                    // to register the just-submitted job before stopping polling.
                    const sinceTrigger = Date.now() - (lastTriggerAtRef.current || 0);
                    if (sinceTrigger < 5000) {
                        // Keep waiting silently, show a subtle waiting message
                        dispatch({ type: actions.SET_STATUS, payload: { type: 'info', message: 'Waiting for jobs…' } });
                        return;
                    }
                    stopPolling(true);
                }
            } catch (err) {
                debug.warn('SD-Queue', 'Polling failed', err);
                stopPolling();
            }
        };

        // Kick once immediately, then interval every 2s
        poll();
        pollerRef.current = setInterval(poll, 2000);
    }, [dispatch, actions, stopPolling, getJobs]);

    const triggerQueuePolling = useCallback(async () => {
        // If already polling, do nothing
        if (isPollingRef.current) return false;
        lastTriggerAtRef.current = Date.now();
        setProcessing(true);
        try {
            // Peek at jobs (best-effort) to update the first status quickly
            // but regardless of the result, start polling with a short grace window
            if (!isPollingRef.current) startPolling();
            return true;
        } catch (err) {
            debug.warn('SD-Queue', 'Trigger failed', err);
            // Even on error, attempt to start polling so we can recover on next ticks
            if (!isPollingRef.current) startPolling();
            return true;
        }
    }, [startPolling, setProcessing]);

    // Expose helpers
    return {
        getJobs,
        triggerQueuePolling,
        isPolling: () => isPollingRef.current,
    };
}