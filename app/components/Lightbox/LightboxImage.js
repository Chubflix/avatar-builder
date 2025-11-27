import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxImage - The main image display with zoom/pan support
 */
export function LightboxImage() {
    const {
        currentImage,
        isZoomed,
        panPosition,
        isPanning,
        isMousePanning,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp
    } = useLightbox();

    if (!currentImage) return null;

    return (
        <div className="lightbox-image-container">
            <img
                src={currentImage.url}
                alt={`Generated ${currentImage.id}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                    transform: isZoomed
                        ? `scale(2) translate(${panPosition.x / 2}px, ${panPosition.y / 2}px)`
                        : 'scale(1)',
                    transition: (isPanning || isMousePanning) ? 'none' : 'transform 0.3s ease',
                    cursor: isZoomed ? 'move' : 'default',
                    touchAction: isZoomed ? 'none' : 'auto',
                    userSelect: 'none'
                }}
            />
        </div>
    );
}
