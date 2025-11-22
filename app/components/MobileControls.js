import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import FolderSelector from './FolderSelector';
import LoraSettings from './LoraSettings';
import MobileToast from './MobileToast';
import MobileSlideout from './MobileSlideout';

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
        showMobileSettings,
        generationQueue
    } = state;

    if (!config) return null;

    return (
        <>
            {/* Top Progress Bar */}
            {isGenerating && (
                <div className="mobile-top-progress">
                    <div className="mobile-top-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            {/* Toast Notification */}
            <MobileToast
                status={status}
                onDismiss={() => dispatch({ type: actions.SET_STATUS, payload: null })}
            />

            {/* Advanced Settings Slideout */}
            <MobileSlideout
                show={showMobileSettings}
                onClose={() => dispatch({ type: actions.SET_SHOW_MOBILE_SETTINGS, payload: false })}
                title="Advanced Settings"
            >
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
            </MobileSlideout>

            {/* Input Bar */}
            <div className="mobile-input-bar mobile-only-flex">
                {/* Input controls */}
                <div>
                    <button
                        className={`mobile-settings-btn ${showMobileSettings ? 'active' : ''}`}
                        onClick={() => {
                            if (!showMobileSettings && state.showMobilePrompt) {
                                // Close prompt if open
                                dispatch({ type: actions.SET_SHOW_MOBILE_PROMPT, payload: false });
                            }
                            dispatch({ type: actions.SET_SHOW_MOBILE_SETTINGS, payload: !showMobileSettings });
                        }}
                    >
                        <i className={`fa fa-${showMobileSettings ? 'times' : 'sliders'}`}></i>
                    </button>
                    <button
                        className="mobile-prompt-btn"
                        onClick={() => {
                            if (!state.showMobilePrompt && showMobileSettings) {
                                // Close settings if open
                                dispatch({ type: actions.SET_SHOW_MOBILE_SETTINGS, payload: false });
                            }
                            dispatch({ type: actions.SET_SHOW_MOBILE_PROMPT, payload: !state.showMobilePrompt });
                        }}
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
                            <>
                                <div className="spinner"></div>
                                {generationQueue.length > 0 && (
                                    <span className="queue-count">{generationQueue.length}</span>
                                )}
                            </>
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
