import React, { useMemo } from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * CivitAiGenerationDetails
 * Custom Lightbox details panel for external CivitAI images without normalizing data.
 * Expects generation metadata under currentImage.meta (optionally JSON string).
 */
export default function CivitAiGenetationDetails({ onSetModel, onCopyPositivePrompt, onCopyNegativePrompt }) {
  const { currentImage, showGenerationDetails } = useLightbox();

  const meta = useMemo(() => {
    if (!currentImage) return null;
    const m = currentImage.meta ?? currentImage.metadata ?? null;
    if (!m) return null;
    if (typeof m === 'string') {
      try {
        return JSON.parse(m);
      } catch {
        return null;
      }
    }
    return m;
  }, [currentImage]);

  if (!showGenerationDetails || !currentImage) return null;

  // If no meta, render a minimal "N/A" sidebar to keep layout consistent
  if (!meta || typeof meta !== 'object') {
    return (
      <div className="lightbox-details-sidebar">
        <div className="settings-display">
          <div><strong>Details:</strong> N/A</div>
        </div>
      </div>
    );
  }

  const sizeText = meta.Size || meta.size || '';
  let dims = null;
  if (typeof sizeText === 'string' && sizeText.includes('x')) {
    dims = sizeText;
  } else if (currentImage.width && currentImage.height) {
    dims = `${currentImage.width}x${currentImage.height}`;
  }

  const model = meta.Model || meta.model || (meta.resources && Array.isArray(meta.resources) && meta.resources[0]?.name) || 'N/A';
  const sampler = meta.sampler || meta.Sampler || 'N/A';
  const scheduler = meta['Schedule type'] || meta.scheduler || 'N/A';
  const steps = meta.steps ?? meta.Steps ?? 'N/A';
  const cfgScale = meta.cfgScale ?? meta['CFG Scale'] ?? meta['Hires CFG Scale'] ?? 'N/A';
  const seed = meta.seed ?? meta.Seed;
  const positivePrompt = meta.prompt || meta.Prompt;
  const negativePrompt = meta.negativePrompt || meta['Negative prompt'] || meta.NegativePrompt;

  const adetailerEnabled = Boolean(
    meta['ADetailer model'] || meta['ADetailer version'] || meta['ADetailer denoising strength']
  );

  return (
    <div className="lightbox-details-sidebar">
      {(positivePrompt || negativePrompt) && (
        <div className="settings-display" style={{ marginBottom: '1rem' }}>
          {positivePrompt && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (!positivePrompt) return;
                    if (typeof onCopyPositivePrompt === 'function') {
                      onCopyPositivePrompt(positivePrompt);
                    } else if (navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(positivePrompt).catch(() => {});
                    }
                  }}
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
                <strong>Positive Prompt:</strong>
              </div>
              <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                {positivePrompt}
              </p>
            </>
          )}
          {negativePrompt && (
            <>
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!negativePrompt) return;
                    if (typeof onCopyNegativePrompt === 'function') {
                      onCopyNegativePrompt(negativePrompt);
                    } else if (navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(negativePrompt).catch(() => {});
                    }
                  }}
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
                {negativePrompt}
              </p>
            </>
          )}
        </div>
      )}

      <div className="settings-display">
        <div>
          <strong>Model:</strong>{' '}
          <span
            className="selectable-setting"
            onClick={() => onSetModel && onSetModel(model)}
            title="Set as current model"
          >
            {model}
          </span>
        </div>
        {dims && (
          <div><strong>Dimensions:</strong> {dims}</div>
        )}
        <div><strong>Sampler:</strong> {sampler}</div>
        <div><strong>Scheduler:</strong> {scheduler}</div>
        <div><strong>Steps:</strong> {steps}</div>
        <div><strong>CFG Scale:</strong> {cfgScale}</div>
        {typeof seed !== 'undefined' && seed !== -1 && seed !== null && (
          <div><strong>Seed:</strong> {seed}</div>
        )}
        {adetailerEnabled && (
          <div><strong>ADetailer:</strong> {meta['ADetailer model'] || 'Enabled'}</div>
        )}
      </div>
    </div>
  );
}
