import React from 'react';
import { useLightbox } from '@/app/context/LightboxContext';

/**
 * LightboxNavigation - Previous and next navigation arrows
 */
export function LightboxNavigation() {
    const { filteredLightboxIndex, filteredImages, onNavigate } = useLightbox();

    return (
        <>
            {filteredLightboxIndex > 0 && (
                <button
                    className="lightbox-nav lightbox-prev"
                    onClick={() => onNavigate(filteredLightboxIndex - 1)}
                >
                    <i className="fa fa-chevron-left"></i>
                </button>
            )}
            {filteredLightboxIndex < filteredImages.length - 1 && (
                <button
                    className="lightbox-nav lightbox-next"
                    onClick={() => onNavigate(filteredLightboxIndex + 1)}
                >
                    <i className="fa fa-chevron-right"></i>
                </button>
            )}
        </>
    );
}
