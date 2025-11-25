'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ModalHeader } from '@/app/design-system/molecules/ModalHeader';
import { IconButton } from '@/app/design-system/atoms/IconButton';
import sdAPI from '../utils/sd-api';
import { getAblyRealtime } from '../lib/ably';
import './QueueManagerModal.css';

function QueueManagerModal({ show, onClose }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(new Set());

    // Fetch jobs from SD API
    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);
            const jobsData = await sdAPI.getJobs();
            setJobs(Array.isArray(jobsData) ? jobsData : []);
        } catch (err) {
            console.error('Failed to fetch jobs:', err);
            setError('Failed to load queue jobs');
        } finally {
            setLoading(false);
        }
    };

    // Load jobs when modal opens
    useEffect(() => {
        if (show) {
            fetchJobs();
        }
    }, [show]);

    // Subscribe to realtime job deletion events
    useEffect(() => {
        if (!show) return;

        const ably = getAblyRealtime();
        if (!ably) return;

        const channel = ably.channels.get('queue');

        const handleJobDeleted = (message) => {
            const { jobId } = message.data;
            if (jobId) {
                setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId && job.uuid !== jobId));
                setDeleting(prev => {
                    const next = new Set(prev);
                    next.delete(jobId);
                    return next;
                });
            }
        };

        channel.subscribe('job_deleted', handleJobDeleted);

        return () => {
            channel.unsubscribe('job_deleted', handleJobDeleted);
        };
    }, [show]);

    // Handle job cancellation
    const handleCancelJob = async (job) => {
        const jobId = job.id || job.uuid;
        if (!jobId) return;

        setDeleting(prev => new Set(prev).add(jobId));

        try {
            const result = await sdAPI.deleteJob(jobId);

            if (result.success) {
                // Broadcast deletion via server-side API
                try {
                    await fetch('/api/queue/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'job_deleted',
                            data: { jobId }
                        })
                    });
                } catch (broadcastError) {
                    console.warn('[Queue] Failed to broadcast job_deleted:', broadcastError);
                }

                // Remove from local state immediately
                setJobs(prevJobs => prevJobs.filter(j => {
                    const id = j.id || j.uuid;
                    return id !== jobId;
                }));
            } else {
                setError(`Failed to cancel job: ${result.error || 'Unknown error'}`);
                setDeleting(prev => {
                    const next = new Set(prev);
                    next.delete(jobId);
                    return next;
                });
            }
        } catch (err) {
            console.error('Failed to cancel job:', err);
            setError('Failed to cancel job');
            setDeleting(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
        }
    };

    if (!show || !mounted) return null;

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content queue-manager-modal" onClick={(e) => e.stopPropagation()}>
                <ModalHeader title="Queue Manager" onClose={onClose} />

                <div className="queue-manager-body">
                    {loading && (
                        <div className="queue-manager-loading">
                            <i className="fa fa-spinner fa-spin"></i>
                            <span>Loading queue...</span>
                        </div>
                    )}

                    {error && (
                        <div className="queue-manager-error">
                            <i className="fa fa-exclamation-circle"></i>
                            <span>{error}</span>
                            <IconButton
                                icon="fa-refresh"
                                variant="secondary"
                                size="small"
                                onClick={fetchJobs}
                                title="Retry"
                            />
                        </div>
                    )}

                    {!loading && !error && jobs.length === 0 && (
                        <div className="queue-manager-empty">
                            <i className="fa fa-inbox"></i>
                            <span>No jobs in queue</span>
                        </div>
                    )}

                    {!loading && jobs.length > 0 && (
                        <div className="queue-manager-list">
                            {jobs.map((job, index) => {
                                const jobId = job.id || job.uuid;
                                const isDeleting = deleting.has(jobId);

                                return (
                                    <div key={jobId || index} className="queue-job-item">
                                        <div className="queue-job-main">
                                            <div className="queue-job-icon">
                                                <i className="fa fa-image"></i>
                                            </div>
                                            <div className="queue-job-details">
                                                <div className="queue-job-label">
                                                    {job.prompt ?
                                                        (job.prompt.length > 60 ?
                                                            `${job.prompt.substring(0, 60)}...` :
                                                            job.prompt)
                                                        : `Job ${jobId || index + 1}`}
                                                </div>
                                                <div className="queue-job-meta">
                                                    <span className="queue-job-status">
                                                        {job.status || 'queued'}
                                                    </span>
                                                    {job.position !== undefined && (
                                                        <span className="queue-job-position">
                                                            Position: {job.position}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="queue-job-actions">
                                                <IconButton
                                                    icon={isDeleting ? "fa-spinner fa-spin" : "fa-times"}
                                                    variant="danger"
                                                    size="medium"
                                                    onClick={() => handleCancelJob(job)}
                                                    disabled={isDeleting}
                                                    title="Cancel Job"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="queue-manager-footer">
                    <button className="btn-secondary" onClick={fetchJobs} disabled={loading}>
                        <i className={`fa ${loading ? 'fa-spinner fa-spin' : 'fa-refresh'}`}></i>
                        Refresh
                    </button>
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default QueueManagerModal;
