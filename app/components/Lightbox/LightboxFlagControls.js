import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxFlagControls - Favorite and NSFW toggle buttons
 * Receives handlers as props for better reusability
 */
export function LightboxFlagControls({ onToggleFavorite, onToggleNsfw }) {
    const { currentImage, isZoomed } = useLightbox();

    if (!currentImage || isZoomed) return null;

    return (
        <div className="lightbox-flag-controls">
            <button
                className={`lightbox-control-btn favorite-btn ${currentImage.is_favorite ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(currentImage);
                }}
                title={currentImage.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <i className={`fa ${currentImage.is_favorite ? 'fa-heart' : 'fa-heart-o'}`}></i>
            </button>
            <button
                className={`lightbox-control-btn nsfw-btn ${currentImage.is_nsfw ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleNsfw(currentImage);
                }}
                title={currentImage.is_nsfw ? 'Mark as SFW' : 'Mark as NSFW'}
            >
                <i className={`fa ${currentImage.is_nsfw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
        </div>
    );
}
