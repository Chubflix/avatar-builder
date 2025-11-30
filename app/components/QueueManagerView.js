'use client';

import React from 'react';
import { IconButton } from '@/app/design-system/atoms/IconButton';

/**
 * Pure presentational component for displaying queue manager content
 * Receives all data via props, no business logic or API calls
 */
function QueueManagerView({
    // Data
    active,
    pending,
    completed,
    error,
    canceled,
    workflows,

    // UI state
    activeTab,
    setActiveTab,
    isMobile,
    loading,
    apiError,
    deleting,

    // Actions
    onCancelJob,
    onRefresh,
}) {
    // Get workflow for a job
    const getWorkflowForJob = (job) => {
        if (!job || !job.workflow) return null;
        return workflows.find(w => w.workflow === job.workflow);
    };

    // Calculate step progress
    const calculateStepProgress = (job, workflow) => {
        if (!workflow || !workflow.steps) return [];

        const statusRaw = (job.job_status || job.status || job.state || 'queued') + '';
        const status = statusRaw.toLowerCase();

        // Normalize progress (supports 0..1 and 0..100)
        const normalizePercent = (val) => {
            let n = Number(val);
            if (!Number.isFinite(n)) return 0;
            if (n > 0 && n <= 1) n = n * 100;
            if (n < 0) n = 0;
            if (n > 100) n = 100;
            return Math.round(n);
        };

        const jobProgress = normalizePercent(job.progress ?? job.progress_pct ?? job.percent ?? job.percentage ?? 0);

        // Determine current step based on status
        let isReadyFor = false;
        let currentStepIndex = workflow.steps.findIndex(s => s === status);

        if (status.startsWith('ready-for-')) {
            isReadyFor = true;
        }

        // Build step progress array
        return workflow.steps.map((step, index) => {
            let progress = 0;
            let isCurrent = false;

            if (currentStepIndex === -1) {
                // If we can't determine step, use job progress for first step
                if (index === 0) {
                    progress = jobProgress;
                    isCurrent = true;
                }
            } else {
                if (isReadyFor) {
                    // If ready-for-X, previous step is complete
                    if (index < currentStepIndex) {
                        progress = 100;
                    } else if (index === currentStepIndex - 1) {
                        progress = 100;
                        isCurrent = true;
                    } else {
                        progress = 0;
                    }
                } else {
                    // Normal step progression
                    if (index < currentStepIndex) {
                        progress = 100;
                    } else if (index === currentStepIndex) {
                        progress = jobProgress;
                        isCurrent = true;
                    } else {
                        progress = 0;
                    }
                }
            }

            return { step, progress, isCurrent };
        }).filter(({step}) => !step.startsWith('ready-for-') && step !== 'completed');
    };

    // Render workflow visualization
    const renderWorkflowVisualization = (job) => {
        const workflow = getWorkflowForJob(job);
        if (!workflow) return null;

        const stepProgress = calculateStepProgress(job, workflow);

        if (isMobile) {
            // Mobile: vertical list
            return (
                <div className="workflow-mobile">
                    {stepProgress.map(({ step, progress, isCurrent }, index) => (
                        <div key={index} className={`workflow-step-mobile ${isCurrent ? 'current' : ''}`}>
                            <div className="workflow-step-name">{step}</div>
                            <div className="workflow-step-progress">
                                <div className="workflow-step-progress-bar" style={{ width: `${progress}%` }}></div>
                                <span className="workflow-step-progress-text">{progress}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // Desktop: horizontal with lines
        return (
            <div className="workflow-desktop">
                {stepProgress.map(({ step, progress, isCurrent }, index) => (
                    <React.Fragment key={index}>
                        <div className={`workflow-step ${isCurrent ? 'current' : ''}`}>
                            <div className="workflow-step-name">{step}</div>
                            <div className="workflow-step-progress-text">{progress}%</div>
                        </div>
                        {index < stepProgress.length - 1 && (
                            <div className="workflow-connector"></div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    // Render job item
    const renderJobItem = (job, showCancel = true) => {
        const jobId = job.id || job.uuid;
        const isDeleting = deleting.has(jobId);
        const statusRaw = (job.job_status || job.status || job.state || 'queued') + '';
        const status = statusRaw.toLowerCase();
        const normalizePercent = (val) => {
            let n = Number(val);
            if (!Number.isFinite(n)) return 0;
            if (n > 0 && n <= 1) n = n * 100;
            if (n < 0) n = 0;
            if (n > 100) n = 100;
            return Math.round(n);
        };
        const progressPct = normalizePercent(job.progress ?? job.progress_pct ?? job.percent ?? job.percentage);
        const createdAtStr = job.created_at ? new Date(job.created_at).toLocaleString() : null;

        return (
            <div key={jobId} className="queue-job-item">
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
                                : `Job ${jobId}`}
                        </div>
                        <div className="queue-job-meta">
                            <span className="queue-job-status" title="Job status">
                                {status}
                            </span>
                            {job.position !== undefined && (
                                <span className="queue-job-position">
                                    Position: {job.position}
                                </span>
                            )}
                            {job.type && (
                                <span className="queue-job-type" title="Job type">
                                    Type: {job.type}
                                </span>
                            )}
                            {createdAtStr && (
                                <span className="queue-job-created" title="Created at">
                                    Created: {createdAtStr}
                                </span>
                            )}
                            <span className="queue-job-progress" title="Progress">
                                {progressPct}%
                            </span>
                        </div>
                    </div>
                    {showCancel && (
                        <div className="queue-job-actions">
                            <IconButton
                                icon={isDeleting ? "fa-spinner fa-spin" : "fa-times"}
                                variant="danger"
                                size="medium"
                                onClick={() => onCancelJob(job)}
                                disabled={isDeleting}
                                title="Cancel Job"
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="queue-manager-loading">
                <i className="fa fa-spinner fa-spin"></i>
                <span>Loading queue...</span>
            </div>
        );
    }

    if (apiError) {
        return (
            <div className="queue-manager-error">
                <i className="fa fa-exclamation-circle"></i>
                <span>{apiError}</span>
                <IconButton
                    icon="fa-refresh"
                    variant="secondary"
                    size="small"
                    onClick={onRefresh}
                    title="Retry"
                />
            </div>
        );
    }

    return (
        <>
            {/* Active job with workflow visualization */}
            {active && !isMobile && (
                <div className="queue-active-section">
                    <h3 className="queue-section-title">Currently Running</h3>
                    {renderWorkflowVisualization(active)}
                    {renderJobItem(active)}
                </div>
            )}

            {/* Tab view for job categories */}
            {!isMobile && (
                <div className="queue-tabs">
                    <button
                        className={`queue-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending ({pending.length})
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        Completed ({completed.length})
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'error' ? 'active' : ''}`}
                        onClick={() => setActiveTab('error')}
                    >
                        Error ({error.length})
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'canceled' ? 'active' : ''}`}
                        onClick={() => setActiveTab('canceled')}
                    >
                        Canceled ({canceled.length})
                    </button>
                </div>
            )}

            {/* Mobile: Include workflow progress as tab */}
            {isMobile && active && (
                <div className="queue-tabs">
                    <button
                        className={`queue-tab ${activeTab === 'progress' ? 'active' : ''}`}
                        onClick={() => setActiveTab('progress')}
                    >
                        Progress
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending ({pending.length})
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        Completed ({completed.length})
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'error' ? 'active' : ''}`}
                        onClick={() => setActiveTab('error')}
                    >
                        Error ({error.length})
                    </button>
                    <button
                        className={`queue-tab ${activeTab === 'canceled' ? 'active' : ''}`}
                        onClick={() => setActiveTab('canceled')}
                    >
                        Canceled ({canceled.length})
                    </button>
                </div>
            )}

            {/* Tab content */}
            <div className="queue-tab-content">
                {isMobile && activeTab === 'progress' && active && (
                    <div className="queue-manager-list">
                        {renderWorkflowVisualization(active)}
                        {renderJobItem(active)}
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="queue-manager-list">
                        {pending.length === 0 ? (
                            <div className="queue-manager-empty">
                                <i className="fa fa-inbox"></i>
                                <span>No pending jobs</span>
                            </div>
                        ) : (
                            pending.map(job => renderJobItem(job))
                        )}
                    </div>
                )}

                {activeTab === 'completed' && (
                    <div className="queue-manager-list">
                        {completed.length === 0 ? (
                            <div className="queue-manager-empty">
                                <i className="fa fa-check-circle"></i>
                                <span>No completed jobs in the last 5 minutes</span>
                            </div>
                        ) : (
                            completed.map(job => renderJobItem(job, false))
                        )}
                    </div>
                )}

                {activeTab === 'error' && (
                    <div className="queue-manager-list">
                        {error.length === 0 ? (
                            <div className="queue-manager-empty">
                                <i className="fa fa-exclamation-circle"></i>
                                <span>No errors in the last 5 minutes</span>
                            </div>
                        ) : (
                            error.map(job => renderJobItem(job, false))
                        )}
                    </div>
                )}

                {activeTab === 'canceled' && (
                    <div className="queue-manager-list">
                        {canceled.length === 0 ? (
                            <div className="queue-manager-empty">
                                <i className="fa fa-ban"></i>
                                <span>No canceled jobs in the last 5 minutes</span>
                            </div>
                        ) : (
                            canceled.map(job => renderJobItem(job, false))
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default QueueManagerView;
