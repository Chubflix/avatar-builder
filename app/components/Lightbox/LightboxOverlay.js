import React from 'react';
import { useLightbox } from '@/app/context/LightboxContext';

/**
 * LightboxOverlay - The root overlay container
 */
export function LightboxOverlay({ children }) {
    const { onClose, handleTouchStart, handleTouchMove, handleTouchEnd, isZoomed, handleToggleZoom } = useLightbox();

    const handleOverlayClick = () => {
        if (isZoomed) {
            // If zoomed, exit zoom mode instead of closing lightbox
            handleToggleZoom();
        } else {
            // If not zoomed, close the lightbox
            onClose();
        }
    };

    return (
        <div
            className="lightbox-overlay"
            onClick={handleOverlayClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {children}
        </div>
    );
}
