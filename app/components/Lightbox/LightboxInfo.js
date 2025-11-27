import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxInfo - Bottom metadata and folder info
 * Receives children for optional custom info sections (like folder selector button)
 */
export function LightboxInfo({ children }) {
    const { currentImage, lightboxIndex, images } = useLightbox();

    if (!currentImage) return null;

    // Build meta parts conditionally to support external images that may not have full metadata
    const parts = [];
    if (currentImage.created_at) {
        const date = new Date(currentImage.created_at);
        if (!isNaN(date.getTime())) {
            parts.push(date.toLocaleString());
        }
    }
    if (currentImage.width && currentImage.height) {
        parts.push(`${currentImage.width}x${currentImage.height}`);
    }
    // Always show index if available
    if (typeof lightboxIndex === 'number' && Array.isArray(images)) {
        parts.push(`${lightboxIndex + 1} / ${images.length}`);
    }

    return (
        <div className="lightbox-info">
            <div className="lightbox-meta">
                {parts.map((p, i) => (
                    <span key={i}>
                        {i > 0 ? ' • ' : ''}{p}
                    </span>
                ))}
            </div>

            {children}
        </div>
    );
}
