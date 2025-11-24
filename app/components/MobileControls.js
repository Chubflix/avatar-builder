import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useQueueContext } from '../context/QueueContext';
import FolderSelector from './FolderSelector';
import LoraSettings from './LoraSettings';
import InpaintModal from './InpaintModal';
import './LoraSettings.css';
import MobileToast from './MobileToast';
import MobileSlideout from './MobileSlideout';

function MobileControls({ onGenerate, onResetDefaults }) {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    // Collapsible sections inside mobile Advanced Settings
    const [showGeneralSettings, setShowGeneralSettings] = useState(true);
    const [showImg2ImgSettings, setShowImg2ImgSettings] = useState(false);
    const [showLoraSettings, setShowLoraSettings] = useState(false);
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
    const { count: queueCount } = useQueueContext();

    if (!config) return null;

    return (
        <>
            {/* Top Progress Bar */}
            {/* Removed sticky top progress for mobile; queue counter moves to generate button */}

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
                        {/* General Section */}
                        <div
                            className={`collapsible-header ${showGeneralSettings ? 'open' : ''}`}
                            style={{ marginTop: 0 }}
                            onClick={() => setShowGeneralSettings(!showGeneralSettings)}
                        >
                            <h3>General</h3>
                            <i className="fa fa-chevron-down"></i>
                        </div>
                        <div className={`collapsible-content ${showGeneralSettings ? 'open' : ''}`}>
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
                        </div>

                        {/* Img2Img (and Inpaint) Section */}
                        <div
                            className={`collapsible-header ${showImg2ImgSettings ? 'open' : ''}`}
                            onClick={() => setShowImg2ImgSettings(!showImg2ImgSettings)}
                        >
                            <h3>img2img</h3>
                            <i className="fa fa-chevron-down"></i>
                        </div>
                        <div className={`collapsible-content ${showImg2ImgSettings ? 'open' : ''}`}>
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
                                            // Clear previous mask for new source image
                                            dispatch({ type: actions.SET_MASK_IMAGE, payload: null });
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                                {state.initImage && (
                                    <div className="image-preview">
                                        <img src={state.initImage} alt="Init Preview" style={{ maxWidth: '100%', maxHeight: 200, display: 'block', marginTop: 8 }} />
                                        <div className="lora-group" style={{ marginTop: 8 }}>
                                            <div className="lora-slider-header">
                                                <label className="lora-label">
                                                    <span>Denoising Strength</span>
                                                    <span
                                                        className="lora-doc-link"
                                                        title="Controls how much the output deviates from the source image. Lower = closer to original; higher = more creative changes."
                                                        style={{ cursor: 'help' }}
                                                    >
                                                        <i className="fa fa-question-circle"></i>
                                                    </span>
                                                </label>
                                                <span className="lora-slider-value">{state.denoisingStrength.toFixed(2)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                className="lora-slider"
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                value={state.denoisingStrength}
                                                onChange={(e) => dispatch({ type: actions.SET_DENOISING_STRENGTH, payload: parseFloat(e.target.value) })}
                                            />
                                            <div className="lora-slider-labels">
                                                <span className="lora-slider-label-min">Original</span>
                                                <span className="lora-slider-label-max">Creative</span>
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            type="button"
                                            onClick={() => {
                                                dispatch({ type: actions.SET_INIT_IMAGE, payload: null });
                                                dispatch({ type: actions.SET_MASK_IMAGE, payload: null });
                                            }}
                                            style={{ marginTop: 8 }}
                                        >
                                            <i className="fa fa-times"></i> Clear Init Image
                                        </button>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                onClick={() => dispatch({ type: actions.SET_SHOW_INPAINT_MODAL, payload: true })}
                                                title="Open inpaint mask editor"
                                            >
                                                <i className="fa fa-paint-brush"></i> Inpaint Mask
                                            </button>
                                            {state.maskImage ? (
                                                <>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mask set</span>
                                                    <button
                                                        className="btn btn-secondary"
                                                        type="button"
                                                        onClick={() => dispatch({ type: actions.SET_MASK_IMAGE, payload: null })}
                                                        title="Clear mask"
                                                    >
                                                        <i className="fa fa-eraser"></i> Clear Mask
                                                    </button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No mask</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <p className="settings-hint">If an init image is provided, image-to-image will be used. Clear it to use text-to-image.</p>
                            </div>
                        </div>

                        {/* Lora Settings */}
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

            {/* Inpaint Modal (mobile accessible) */}
            <InpaintModal />

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
                            </>
                        ) : (
                            <i className="fa fa-magic"></i>
                        )}
                        {queueCount > 0 && (
                            <span className="queue-count">{queueCount}</span>
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
