import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import PromptAutocomplete from '../PromptAutocomplete';

function AdvancedSettingsTab({ onResetDefaults }) {
    const { state, dispatch, actions } = useApp();
    const negRef = useRef(null);

    const {
        config,
        negativePrompt,
        selectedModel,
        seed,
        orientation,
        models,
        locks
    } = state;

    if (!config) return null;

    return (
        <div className="tab-content">
            <div className="form-group">
                <label className="form-label">Negative Prompt</label>
                <textarea
                    className="form-textarea"
                    ref={negRef}
                    value={negativePrompt}
                    onChange={(e) => dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: e.target.value })}
                    placeholder="lowres, bad anatomy, watermark..."
                />
                <PromptAutocomplete
                    textareaRef={negRef}
                    value={negativePrompt}
                    onSelect={(text) => dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: text })}
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
    );
}

export default AdvancedSettingsTab;
