import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import FolderSelector from './FolderSelector';
import LoraSettings from './LoraSettings';

function ControlsPanel({ onGenerate, onResetDefaults, onOpenFolderModal }) {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [showLoraSettings, setShowLoraSettings] = useState(false);
    const {
        config,
        positivePrompt,
        negativePrompt,
        selectedModel,
        orientation,
        batchSize,
        seed,
        showAdvanced,
        selectedFolder,
        folders,
        models,
        isGenerating,
        progress,
        status,
        generationQueue
    } = state;

    if (!config) return null;

    return (
        <div className="controls-panel desktop-only">
            <div className="controls-header">
                <h2>Generation Settings</h2>
            </div>

            {/* Positive Prompt */}
            <div className="form-group">
                <label className="form-label">Positive Prompt</label>
                <textarea
                    className="form-textarea"
                    value={positivePrompt}
                    onChange={(e) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: e.target.value })}
                    placeholder="masterpiece, best quality, 1girl, portrait..."
                />
            </div>

            {/* Save to Folder */}
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

            {/* Orientation & Batch Size */}
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
                    <label className="form-label">Batch Size</label>
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

            {/* Lora Settings */}
            {config.loras && config.loras.length > 0 && (
                <>
                    <div
                        className={`collapsible-header ${showLoraSettings ? 'open' : ''}`}
                        onClick={() => setShowLoraSettings(!showLoraSettings)}
                    >
                        <h3>Lora Settings</h3>
                        <i className="fa fa-chevron-down"></i>
                    </div>
                    <div className={`collapsible-content ${showLoraSettings ? 'open' : ''}`}>
                        <LoraSettings />
                    </div>
                </>
            )}

            {/* Advanced Settings */}
            <div
                className={`collapsible-header ${showAdvanced ? 'open' : ''}`}
                onClick={() => dispatch({ type: actions.SET_SHOW_ADVANCED, payload: !showAdvanced })}
            >
                <h3>Advanced Settings</h3>
                <i className="fa fa-chevron-down"></i>
            </div>
            <div className={`collapsible-content ${showAdvanced ? 'open' : ''}`}>
                <div className="form-group">
                    <label className="form-label">Negative Prompt</label>
                    <textarea
                        className="form-textarea"
                        value={negativePrompt}
                        onChange={(e) => dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: e.target.value })}
                        placeholder="lowres, bad anatomy, watermark..."
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

                <div className="form-group">
                    <label className="form-label">Current Settings</label>
                    <div className="settings-display">
                        <div><strong>Sampler:</strong> {config.generation.samplerName}</div>
                        <div><strong>Scheduler:</strong> {config.generation.scheduler}</div>
                        <div><strong>Steps:</strong> {config.generation.steps}</div>
                        <div><strong>CFG Scale:</strong> {config.generation.cfgScale}</div>
                        <div><strong>ADetailer:</strong> {config.adetailer.enabled ? config.adetailer.model : 'Disabled'}</div>
                        <div><strong>Dimensions:</strong> {config.dimensions[orientation].width}x{config.dimensions[orientation].height}</div>
                    </div>
                    <p className="settings-hint">
                        Edit config.json to change these values
                    </p>
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

            {/* Generate Button */}
            <button
                className={`btn-generate ${isGenerating ? 'loading' : ''}`}
                onClick={onGenerate}
                disabled={!selectedModel}
            >
                {isGenerating ? (
                    <>
                        <div className="spinner"></div>
                        Generating...
                    </>
                ) : (
                    <>
                        <i className="fa fa-magic"></i>
                        Generate Images
                    </>
                )}
            </button>

            {isGenerating && (
                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="progress-text">{progress}% complete</div>
                </div>
            )}

            {generationQueue.length > 0 && (
                <div className="queue-status">
                    {generationQueue.length} {generationQueue.length === 1 ? 'generation' : 'generations'} queued...
                </div>
            )}

            {status && (
                <div className={`status-message ${status.type}`}>
                    <i className={`fa ${
                        status.type === 'success' ? 'fa-check-circle' :
                            status.type === 'error' ? 'fa-exclamation-circle' :
                                'fa-info-circle'
                    }`}></i>
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

export default ControlsPanel;