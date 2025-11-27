import React from 'react';
import { useLightbox } from '@/app/context/LightboxContext';

/**
 * LightboxOverlay - The root overlay container
 */
export function LightboxOverlay({ children }) {
    const { onClose, handleTouchStart, handleTouchMove, handleTouchEnd } = useLightbox();

    return (
        <div
            className="lightbox-overlay"
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {children}
        </div>
    );
}
