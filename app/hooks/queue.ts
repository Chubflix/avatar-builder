// @ts-nocheck
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
    const { setCount, setWorkflows } = useQueueContext();
    const pollerRef = useRef(null);
    const isPollingRef = useRef(false);

    const getJobsInfo = useCallback(async () => {
        try {
            const jobs = await sdAPI.getJobs();

            // Helper: coerce to number and clamp to [0..100], supporting 0..1 inputs
            const normalizePercent = (val: any) => {
                let n = Number(val);
                if (!Number.isFinite(n)) return 0;
                if (n > 0 && n <= 1) n = n * 100;
                if (n < 0) n = 0;
                if (n > 100) n = 100;
                return Math.round(n);
            };

            // Helper: derive percent from steps fields
            const pctFromSteps = (obj: any) => {
                const cur = obj?.current_step ?? obj?.step ?? obj?.steps_done ?? obj?.iteration ?? null;
                const tot = obj?.total_steps ?? obj?.max_steps ?? obj?.steps_total ?? obj?.steps ?? null;
                if (cur == null || tot == null) return null;
                const c = Number(cur);
                const t = Number(tot);
                if (!Number.isFinite(c) || !Number.isFinite(t) || t <= 0) return null;
                return normalizePercent((c / t) * 100);
            };

            // Collect all job arrays from various shapes
            let list: any[];
            let arrays: any[] = [];
            if (Array.isArray(jobs)) {
                arrays = [jobs];
            } else if (jobs && typeof jobs === 'object') {
                const j: any = jobs;
                if (Array.isArray(j.jobs)) arrays.push(j.jobs);
                if (Array.isArray(j.queue)) arrays.push(j.queue);
                if (j.queue && typeof j.queue === 'object') {
                    // Common shapes: processing/active/running/pending/waiting
                    ['processing', 'active', 'running', 'pending', 'waiting']
                        .forEach(k => { if (Array.isArray(j.queue[k])) arrays.push(j.queue[k]); });
                }
                // Some proxies expose arrays on top-level keys too
                ['processing', 'active', 'running', 'pending', 'waiting']
                    .forEach(k => { if (Array.isArray(j[k])) arrays.push(j[k]); });
            }
            list = arrays.flat().filter(Boolean);

            // Determine queue count. If none found, try numeric counts
            let count = Array.isArray(list) ? list.length : 0;
            if (count === 0 && jobs && typeof jobs === 'object') {
                const j: any = jobs;
                const numericCandidates = [j.count, j.total, j.queue_count, j.jobs_count];
                for (const c of numericCandidates) {
                    const n = Number(c);
                    if (Number.isFinite(n) && n >= 0) { count = n; break; }
                }
            }

            // Determine the 'active' job
            let active: any;
            const isActive = (s: any) => {
                const status = (s?.status || s?.state || s?.job_status || '').toString().toLowerCase();
                return status && !['queued', 'pending', 'waiting'].includes(status);
            };

            active = (list || []).find(isActive) || null;

            // Some shapes provide a separate current/active object
            if (!active && jobs && typeof jobs === 'object') {
                const j: any = jobs;
                active = j.current || j.active || j.processing || null;
                if (active && Array.isArray(active)) active = active[0];
            }

            // Extract a progress value in [0..100]
            let progress = 0;

            // Top-level progress summary
            if (!active && jobs && typeof jobs === 'object') {
                const j: any = jobs;
                const topCandidates = [j.progress, j.progress_pct, j.progress_percent, j.progressPercentage, j.pct, j.percent, j.percentage, j?.summary?.progress];
                for (const c of topCandidates) {
                    const val = (typeof c === 'object' && c !== null)
                        ? (c.percent ?? c.percentage ?? c.pct ?? c.value)
                        : c;
                    const p = normalizePercent(val);
                    if (p > 0) { progress = p; break; }
                }
            }

            const pickFromObj = (obj: any) => {
                if (!obj || typeof obj !== 'object') return 0;
                // Common fields or nested structures
                const direct = obj.progress ?? obj.pct ?? obj.percent ?? obj.percentage ?? obj.progress_pct;
                const nested = obj?.progress?.percent ?? obj?.progress?.percentage ?? obj?.progress?.pct ?? obj?.progress?.value;
                const fromSteps = pctFromSteps(obj);
                const candidate = direct ?? nested ?? fromSteps;
                return normalizePercent(candidate);
            };

            if (active) {
                const p = pickFromObj(active);
                if (p > 0) progress = p;
            }

            // If everything is queued or we couldn't infer progress, set 0
            if (!Number.isFinite(progress)) progress = 0;

            // If API did not provide an array count but we have an active job
            if (count === 0 && (active || progress > 0)) {
                count = 1;
            }

            return { count, progress };
        } catch (err) {
            debug.warn('SD-Queue', 'Failed to fetch jobs', err);
            return { count: 0, progress: 0 };
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
                const { count, progress } = await getJobsInfo();

                // Update queue count in context
                setCount(count);

                // Update generating state based on whether there are jobs
                if (count > 0) {
                    dispatch({ type: actions.SET_GENERATING, payload: true });
                    dispatch({ type: actions.SET_PROGRESS, payload: progress });
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
    }, [dispatch, actions, stopPolling, getJobsInfo, setCount]);

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

    // Fetch workflows on initialization
    const fetchWorkflows = useCallback(async () => {
        try {
            const workflows = await sdAPI.getWorkflows();
            setWorkflows(workflows);
        } catch (err) {
            debug.warn('SD-Queue', 'Failed to fetch workflows', err);
            setWorkflows([]);
        }
    }, [setWorkflows]);

    // Fetch workflows on initialization
    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

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
