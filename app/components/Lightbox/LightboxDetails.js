import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxDetails - Generation details sidebar
 * Receives onSetModel as prop for better reusability
 */
export function LightboxDetails({ onSetModel, onCopyPositivePrompt, onCopyNegativePrompt }) {
    const { currentImage, showGenerationDetails } = useLightbox();

    if (!showGenerationDetails || !currentImage) return null;

    const positive = currentImage.positive_prompt || '';
    const negative = currentImage.negative_prompt || '';

    const handleCopyPositive = () => {
        if (!positive) return;
        if (typeof onCopyPositivePrompt === 'function') {
            onCopyPositivePrompt(positive);
            return;
        }
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(positive).catch(() => {});
        }
    };

    const handleCopyNegative = () => {
        if (!negative) return;
        if (typeof onCopyNegativePrompt === 'function') {
            onCopyNegativePrompt(negative);
            return;
        }
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(negative).catch(() => {});
        }
    };

    return (
        <div className="lightbox-details-sidebar">
            <div className="settings-display" style={{ marginBottom: '1rem' }}>
                <div>
                    {positive && (
                        <button
                            type="button"
                            onClick={handleCopyPositive}
                            title="Copy positive prompt"
                            aria-label="Copy positive prompt"
                            style={{
                                marginRight: 8,
                                padding: 0,
                                background: 'transparent',
                                border: 'none',
                                fontSize: '0.9rem',
                                lineHeight: 1,
                                cursor: 'pointer',
                                color: 'inherit'
                            }}
                        >
                            <i className="fa fa-clipboard" aria-hidden="true" />
                        </button>
                    )}
                    <strong>Positive Prompt:</strong>
                </div>
                <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                    {positive || 'N/A'}
                </p>
                {negative && (
                    <>
                        <div style={{ marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={handleCopyNegative}
                                title="Copy negative prompt"
                                aria-label="Copy negative prompt"
                                style={{
                                    marginRight: 8,
                                    padding: 0,
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                    color: 'inherit'
                                }}
                            >
                                <i className="fa fa-clipboard" aria-hidden="true" />
                            </button>
                            <strong>Negative Prompt:</strong>
                        </div>
                        <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                            {negative}
                        </p>
                    </>
                )}
            </div>
            <div className="settings-display">
                <div><strong>Model:</strong> <span className="selectable-setting" onClick={() => onSetModel(currentImage.model)} title="Set as current model">
                    {currentImage.model || 'N/A'}
                </span></div>
                <div><strong>Dimensions:</strong> {currentImage.width}×{currentImage.height}</div>
                <div><strong>Sampler:</strong> {currentImage.sampler_name || 'N/A'}</div>
                <div><strong>Scheduler:</strong> {currentImage.scheduler || 'N/A'}</div>
                <div><strong>Steps:</strong> {currentImage.steps || 'N/A'}</div>
                <div><strong>CFG Scale:</strong> {currentImage.cfg_scale || 'N/A'}</div>
                {currentImage.seed && currentImage.seed !== -1 && (
                    <div><strong>Seed:</strong> {currentImage.seed}</div>
                )}
                {currentImage.adetailer_enabled && (
                    <div><strong>ADetailer:</strong> {currentImage.adetailer_model || 'Enabled'}</div>
                )}
            </div>
            {currentImage.loras && (() => {
                const loras = typeof currentImage.loras === 'string'
                    ? JSON.parse(currentImage.loras)
                    : currentImage.loras;

                const hasActiveSliders = loras.sliders && Object.values(loras.sliders).some(s => s.enabled);
                const hasActiveToggles = loras.toggles && Object.values(loras.toggles).some(t => t);
                const hasStyle = loras.style && loras.style !== '';

                if (!hasActiveSliders && !hasActiveToggles && !hasStyle) {
                    return null;
                }

                return (
                    <div className="settings-display" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ marginBottom: '0.75rem' }}><strong>Loras:</strong></div>

                        {hasStyle && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Style:</div>
                                <div style={{ fontSize: '0.85rem', marginTop: '0.125rem' }}>{loras.style}</div>
                            </div>
                        )}

                        {hasActiveSliders && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sliders:</div>
                                {Object.entries(loras.sliders)
                                    .filter(([_, slider]) => slider.enabled)
                                    .map(([name, slider]) => (
                                        <div key={name} style={{ fontSize: '0.85rem', marginTop: '0.125rem' }}>
                                            {name}: {slider.value?.toFixed(1)}
                                        </div>
                                    ))}
                            </div>
                        )}

                        {hasActiveToggles && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Toggles:</div>
                                {Object.entries(loras.toggles)
                                    .filter(([_, enabled]) => enabled)
                                    .map(([name]) => (
                                        <div key={name} style={{ fontSize: '0.85rem', marginTop: '0.125rem' }}>
                                            {name}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
