import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import FolderSelector from './FolderSelector';
import LoraSettings from './LoraSettings';

function MobileControls({ onGenerate, onResetDefaults }) {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [isClosingSettings, setIsClosingSettings] = useState(false);
    const {
        config,
        positivePrompt,
        negativePrompt,
        selectedModel,
        orientation,
        batchSize,
        seed,
        selectedFolder,
        folders,
        models,
        isGenerating,
        progress,
        status,
        showMobileSettings,
        generationQueue
    } = state;

    // Auto-dismiss status messages after 3 seconds
    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => {
                dispatch({ type: actions.SET_STATUS, payload: null });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [status, dispatch, actions.SET_STATUS]);

    // Handle settings close with animation
    const handleCloseSettings = () => {
        setIsClosingSettings(true);
        setTimeout(() => {
            dispatch({ type: actions.SET_SHOW_MOBILE_SETTINGS, payload: false });
            setIsClosingSettings(false);
        }, 300); // Match animation duration
    };

    if (!config) return null;

    return (
        <>
            {/* Settings Overlay - Sibling to input bar */}
            {showMobileSettings && (
                <div className={`mobile-settings-overlay ${isClosingSettings ? 'closing' : ''}`}>
                    <div className="mobile-settings-content">
                        <div className="form-group">
                            <label className="form-label">Save to Folder</label>
                            <button
                                className="folder-select-display-btn"
                                onClick={() => setShowFolderSelector(true)}
                                type="button"
                            >
                                <i className="fa fa-folder"></i>
                                <span>
                                    {selectedFolder ?
                                        folders.find(f => f.id === selectedFolder)?.name || 'Unfiled'
                                        : 'Unfiled'}
                                </span>
                                <i className="fa fa-chevron-down"></i>
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Negative Prompt</label>
                            <textarea
                                className="form-textarea"
                                value={negativePrompt}
                                onChange={(e) => dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: e.target.value })}
                                placeholder="lowres, bad anatomy, watermark..."
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Model</label>
                            <select
                                className="form-select"
                                value={selectedModel}
                                onChange={(e) => dispatch({ type: actions.SET_SELECTED_MODEL, payload: e.target.value })}
                            >
                                {models.map(model => (
                                    <option key={model.model_name} value={model.model_name}>
                                        {model.model_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Orientation</label>
                                <div className="toggle-group">
                                    <button
                                        className={`toggle-option ${orientation === 'portrait' ? 'active' : ''}`}
                                        onClick={() => dispatch({ type: actions.SET_ORIENTATION, payload: 'portrait' })}
                                    >
                                        Portrait
                                    </button>
                                    <button
                                        className={`toggle-option ${orientation === 'landscape' ? 'active' : ''}`}
                                        onClick={() => dispatch({ type: actions.SET_ORIENTATION, payload: 'landscape' })}
                                    >
                                        Landscape
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Batch</label>
                                <select
                                    className="form-select"
                                    value={batchSize}
                                    onChange={(e) => dispatch({ type: actions.SET_BATCH_SIZE, payload: parseInt(e.target.value) })}
                                >
                                    {[...Array(10)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Seed
                                <span className="form-label-hint">-1 for random</span>
                            </label>
                            <div className="input-with-button">
                                <input
                                    type="number"
                                    className="form-input"
                                    value={seed}
                                    onChange={(e) => dispatch({ type: actions.SET_SEED, payload: parseInt(e.target.value) || -1 })}
                                    min="-1"
                                />
                                <button
                                    className="btn-input-action"
                                    onClick={() => dispatch({ type: actions.SET_SEED, payload: -1 })}
                                    title="Random seed"
                                    type="button"
                                >
                                    <i className="fa fa-random"></i>
                                </button>
                            </div>
                        </div>

                        {/* Lora Settings */}
                        <LoraSettings />

                        <button
                            className="btn-reset"
                            onClick={onResetDefaults}
                            type="button"
                        >
                            <i className="fa fa-refresh"></i>
                            Reset to Defaults
                        </button>
                    </div>
                </div>
            )}

            {/* Input Bar with integrated notifications */}
            <div className="mobile-input-bar mobile-only-flex">
                {/* Status Overlay - Inside input bar */}
                {(isGenerating || generationQueue.length > 0 || status) && (
                    <div className="mobile-overlay-container">
                        {isGenerating && (
                            <div className="mobile-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {generationQueue.length > 0 && (
                            <div className="mobile-queue-status">
                                {generationQueue.length} {generationQueue.length === 1 ? 'generation' : 'generations'} queued...
                            </div>
                        )}

                        {status && (
                            <div className={`mobile-status ${status.type}`}>
                                {status.message}
                            </div>
                        )}
                    </div>
                )}

                {/* Input controls */}
                <div>
                    <button
                        className={`mobile-settings-btn ${showMobileSettings ? 'active' : ''}`}
                        onClick={() => {
                            if (showMobileSettings) {
                                handleCloseSettings();
                            } else {
                                dispatch({ type: actions.SET_SHOW_MOBILE_SETTINGS, payload: true });
                            }
                        }}
                    >
                        <i className={`fa fa-${showMobileSettings ? 'times' : 'sliders'}`}></i>
                    </button>
                    <button
                        className="mobile-prompt-btn"
                        onClick={() => dispatch({ type: actions.SET_SHOW_MOBILE_PROMPT, payload: true })}
                    >
                        <i className="fa fa-pencil"></i>
                        <span>{positivePrompt || 'Enter prompt...'}</span>
                    </button>
                    <button
                        className={`mobile-generate-btn ${isGenerating ? 'loading' : ''}`}
                        onClick={onGenerate}
                        disabled={!selectedModel}
                    >
                        {isGenerating ? (
                            <div className="spinner"></div>
                        ) : (
                            <i className="fa fa-magic"></i>
                        )}
                    </button>
                </div>
            </div>

            {/* Folder Selector Modal */}
            <FolderSelector
                show={showFolderSelector}
                onClose={() => setShowFolderSelector(false)}
                onSelect={(folderId) => {
                    dispatch({ type: actions.SET_SELECTED_FOLDER, payload: folderId });
                    setShowFolderSelector(false);
                }}
                currentFolderId={selectedFolder}
                title="Save to Folder"
            />
        </>
    );
}

export default MobileControls;
