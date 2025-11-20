import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import FolderSelector from './FolderSelector';

function MobileControls({ onGenerate, onResetDefaults }) {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);
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
        showMobileSettings
    } = state;

    if (!config) return null;

    return (
        <div className="mobile-controls mobile-only">
            {showMobileSettings && (
                <div className="mobile-settings-overlay">
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

            <div className="mobile-input-bar">
                <button
                    className={`mobile-settings-btn ${showMobileSettings ? 'active' : ''}`}
                    onClick={() => dispatch({ type: actions.SET_SHOW_MOBILE_SETTINGS, payload: !showMobileSettings })}
                >
                    <i className={`fa fa-${showMobileSettings ? 'times' : 'sliders'}`}></i>
                </button>
                <textarea
                    className="mobile-prompt-input"
                    value={positivePrompt}
                    onChange={(e) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: e.target.value })}
                    placeholder="Enter prompt..."
                    rows={1}
                />
                <button
                    className={`mobile-generate-btn ${isGenerating ? 'loading' : ''}`}
                    onClick={onGenerate}
                    disabled={isGenerating || !selectedModel}
                >
                    {isGenerating ? (
                        <div className="spinner"></div>
                    ) : (
                        <i className="fa fa-magic"></i>
                    )}
                </button>
            </div>

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

            {status && (
                <div className={`mobile-status ${status.type}`}>
                    {status.message}
                </div>
            )}

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
        </div>
    );
}

export default MobileControls;
