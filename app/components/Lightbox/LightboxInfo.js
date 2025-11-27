import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxInfo - Bottom metadata and folder info
 * Receives children for optional custom info sections (like folder selector button)
 */
export function LightboxInfo({ children }) {
    const { currentImage, lightboxIndex, images } = useLightbox();

    if (!currentImage) return null;

    return (
        <div className="lightbox-info">
            <div className="lightbox-meta">
                <span>{new Date(currentImage.created_at).toLocaleString()}</span>
                <span> • {currentImage.width}x{currentImage.height}</span>
                <span> • {lightboxIndex + 1} / {images.length}</span>
            </div>

            {children}
        </div>
    );
}
