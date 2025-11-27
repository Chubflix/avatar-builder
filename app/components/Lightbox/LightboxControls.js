import React, { useState } from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxControls - Top right control buttons
 * Manages optional comparison mode state locally
 */
export function LightboxControls({ showComparisonButton = false, children }) {
    const {
        currentImage,
        onClose,
        handleToggleZoom,
        isZoomed,
        showGenerationDetails,
        setShowGenerationDetails
    } = useLightbox();

    const [showComparison, setShowComparison] = useState(false);

    return (
        <div className="lightbox-controls">
            <button className="lightbox-close" onClick={onClose}>
                <i className="fa fa-times"></i>
            </button>

            {showComparisonButton && currentImage && currentImage.parent_image_id && (
                <button
                    className="lightbox-control-btn"
                    onClick={(e) => { e.stopPropagation(); setShowComparison(v => !v); }}
                    title={showComparison ? 'Hide comparison' : 'Show comparison with original'}
                    aria-label="Toggle comparison"
                >
                    <i className={`fa ${showComparison ? 'fa-columns' : 'fa-columns'}`}></i>
                </button>
            )}

            <button
                className="lightbox-control-btn zoom-btn"
                onClick={handleToggleZoom}
                disabled={showGenerationDetails}
                title={showGenerationDetails ? 'Close details to enable zoom' : (isZoomed ? 'Zoom out' : 'Zoom in')}
                aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
            >
                <i className={`fa ${isZoomed ? 'fa-search-minus' : 'fa-search-plus'}`}></i>
            </button>

            <button
                className="lightbox-info-toggle"
                onClick={() => setShowGenerationDetails(!showGenerationDetails)}
                title="Toggle generation details"
            >
                <i className="fa fa-info-circle"></i>
            </button>

            {children && React.cloneElement(children, { showComparison })}
        </div>
    );
}
