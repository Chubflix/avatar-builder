import React from 'react';
import { useApp } from '../../context/AppContext';
import InpaintModal from '../InpaintModal';

function Img2ImgSettingsTab() {
    const { state, dispatch, actions } = useApp();

    return (
        <div className="tab-content">
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
                            // When setting a new init image, clear any previous mask to avoid mismatch
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
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
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

            {/* Inpaint Modal */}
            <InpaintModal />
        </div>
    );
}

export default Img2ImgSettingsTab;
