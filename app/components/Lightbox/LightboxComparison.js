import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxComparison - Image comparison strip showing ancestry
 * Receives showComparison as a prop from parent
 */
export function LightboxComparison({ showComparison }) {
    const { currentImage, comparisonSelection, filteredImages, onNavigate } = useLightbox();

    if (!showComparison || !comparisonSelection.items.length) return null;

    return (
        <div className="lightbox-compare-strip">
            {comparisonSelection.items.map((img, idx) => {
                const tiles = [];
                const isMissing = img.__missing;
                const prev = idx > 0 ? comparisonSelection.items[idx - 1] : null;
                const isInpaintStep = prev && !prev.__missing && img && !img.__missing && img.generation_type === 'inpaint';

                if (prev && isInpaintStep) {
                    const maskSrc = img.mask_url || null;
                    tiles.push(
                        <div key={`mask-${prev.id}-${img.id}`} className="compare-mask-tile" title="Inpaint mask">
                            {maskSrc ? (
                                <img src={maskSrc} alt="Mask" />
                            ) : (
                                <div className="mask-placeholder">Mask</div>
                            )}
                        </div>
                    );
                }

                tiles.push(
                    <div
                        key={`img-${img.id}-${idx}`}
                        className={`compare-image-tile ${isMissing ? 'missing' : ''} ${img.id === currentImage.id ? 'current' : ''}`}
                        onClick={() => {
                            if (isMissing) return;
                            const targetFilteredIndex = filteredImages.findIndex(i => i.id === img.id);
                            if (targetFilteredIndex !== -1) {
                                onNavigate(targetFilteredIndex);
                            }
                        }}
                    >
                        {isMissing ? (
                            <div className="missing-placeholder">...</div>
                        ) : (
                            <img
                                src={img.url}
                                alt={`Image ${img.id}`}
                            />
                        )}
                    </div>
                );

                return <React.Fragment key={`frag-${img.id}-${idx}`}>{tiles}</React.Fragment>;
            })}
            {comparisonSelection.moreCount > 0 && (
                <div className="compare-more">+{comparisonSelection.moreCount} more</div>
            )}
        </div>
    );
}
