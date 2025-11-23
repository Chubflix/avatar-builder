import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import FolderSelector from './FolderSelector';
import LoraSettings from './LoraSettings';
import GenerateButton from "./GenerateButton";
import FormLabelInfo from "./FormLabelInfo";

function ControlsPanel({ onGenerate, onResetDefaults }) {
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
        generationQueue,
        locks
    } = state;

    if (!config) return null;

    return (
        <div className="controls-panel desktop-only">
            <div className="controls-header">
                <h2>Generation Settings</h2>
            </div>

            {/* Positive Prompt */}
            <div className="form-group">
                <FormLabelInfo
                    label="Positive Prompt"
                    alt="Test"
                    onClick={() => dispatch({ type: actions.SET_SHOW_PROMPT_MODAL, payload: true })}
                />
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

            {/* Optional: Image-to-Image source */}
            <div className="form-group">
                <label className="form-label">Init Image (optional)</label>
                <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={async (e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                            // Store as data URL; sd-api will normalize if needed
                            dispatch({ type: actions.SET_INIT_IMAGE, payload: reader.result });
                        };
                        reader.readAsDataURL(file);
                    }}
                />
                {state.initImage && (
                    <div className="image-preview">
                        <img src={state.initImage} alt="Init Preview" style={{ maxWidth: '100%', maxHeight: 200, display: 'block', marginTop: 8 }} />
                        <div className="input-with-button" style={{ marginTop: 8 }}>
                            <label className="form-label" style={{ marginRight: 8 }}>Denoising Strength: {state.denoisingStrength.toFixed(2)}</label>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={state.denoisingStrength}
                                onChange={(e) => dispatch({ type: actions.SET_DENOISING_STRENGTH, payload: parseFloat(e.target.value) })}
                            />
                        </div>
                        <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => dispatch({ type: actions.SET_INIT_IMAGE, payload: null })}
                            style={{ marginTop: 8 }}
                        >
                            <i className="fa fa-times"></i> Clear Init Image
                        </button>
                    </div>
                )}
                <p className="settings-hint">If an init image is provided, image-to-image will be used. Clear it to use text-to-image.</p>
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
                    <div className="input-with-button">
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
                        <button
                            className={`btn-input-action ${locks.model ? 'active' : ''}`.trim()}
                            onClick={() => dispatch({ type: actions.TOGGLE_LOCK, payload: 'model' })}
                            title="Lock selected model from changing"
                            type="button"
                        >
                            <i className="fa fa-lock"></i>
                        </button>
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

                <div className="form-group">
                    <label className="form-label">Current Settings</label>
                    <div className="settings-display">
                        <div><strong>Sampler:</strong> {config.generation.samplerName}</div>
                        <div><strong>Scheduler:</strong> {config.generation.scheduler}</div>
                        <div><strong>Steps:</strong> {config.generation.steps}</div>
                        <div><strong>CFG Scale:</strong> {config.generation.cfgScale}</div>
                        <div><strong>ADetailer:</strong> {config.adetailer.enabled ? config.adetailer.model : 'Disabled'}</div>
                        <div><strong>Dimensions:</strong> {config.dimensions[orientation].width}x{config.dimensions[orientation].height}</div>
                        {state.initImage && (
                            <div><strong>Mode:</strong> Img2Img (denoise {state.denoisingStrength.toFixed(2)})</div>
                        )}
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
            <GenerateButton onGenerate={onGenerate} />

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