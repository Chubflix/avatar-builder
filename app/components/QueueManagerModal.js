'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ModalHeader } from '@/app/design-system/molecules/ModalHeader';
import { useQueueContext } from '../context/QueueContext';
import QueueManagerView from './QueueManagerView';
import sdAPI from '../utils/sd-api';
import './QueueManagerModal.css';
import {notifyQueue} from "@/actions/queue";

/**
 * Modal wrapper component that handles wiring between context and view
 * All business logic and data fetching happens in the queue hook/context
 */
function QueueManagerModal({ show, onClose }) {
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [deleting, setDeleting] = useState(new Set());

    // Get categorized jobs and workflows from context
    const { jobs, workflows } = useQueueContext();
    const { active, pending, completed, error, canceled } = jobs;

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const checkMobile = () => setIsMobile(window.innerWidth <= 768);
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => {
                setMounted(false);
                window.removeEventListener('resize', checkMobile);
            };
        }
        return () => setMounted(false);
    }, []);

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
                    await notifyQueue({
                        eventType: 'job_deleted',
                        data: { jobId }
                    })
                } catch (broadcastError) {
                    console.warn('[Queue] Failed to broadcast job_deleted:', broadcastError);
                }
            }

            // Remove from deleting set
            setDeleting(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
        } catch (err) {
            console.error('Failed to cancel job:', err);
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
                    <QueueManagerView
                        // Data from context
                        active={active}
                        pending={pending}
                        completed={completed}
                        error={error}
                        canceled={canceled}
                        workflows={workflows}

                        // UI state
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isMobile={isMobile}
                        loading={false}
                        apiError={null}
                        deleting={deleting}

                        // Actions
                        onCancelJob={handleCancelJob}
                        onRefresh={() => {}}
                    />
                </div>

                <div className="queue-manager-footer">
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
