import React from 'react';
import { useLightbox } from '../../context/LightboxContext';

/**
 * LightboxActions - Bottom action buttons
 * Receives business logic handlers as props for better reusability
 */
export function LightboxActions({
    onDownload,
    onSetInitImage,
    onStartInpaint,
    onCopyToClipboard,
    onRestoreSettings,
    onDelete
}) {
    const { currentImage, onClose } = useLightbox();

    if (!currentImage) return null;

    return (
        <div className="lightbox-actions">
            <button
                className="image-btn"
                onClick={() => onDownload(currentImage)}
                title="Download"
            >
                <i className="fa fa-download"></i> <span className="btn-label">Download</span>
            </button>
            <button
                className="image-btn secondary"
                onClick={() => onSetInitImage(currentImage)}
                title="Use as Img2Img source"
            >
                <i className="fa fa-file-image-o"></i> <span className="btn-label">Img2Img</span>
            </button>
            <button
                className="image-btn secondary"
                onClick={() => onStartInpaint(currentImage)}
                title="Inpaint: paint a mask and regenerate"
            >
                <i className="fa fa-paint-brush"></i> <span className="btn-label">Inpaint</span>
            </button>
            <button
                className="image-btn secondary"
                onClick={() => onCopyToClipboard(currentImage)}
                title="Copy to clipboard"
            >
                <i className="fa fa-copy"></i> <span className="btn-label">Copy</span>
            </button>
            <button
                className="image-btn secondary"
                onClick={() => {
                    onRestoreSettings(currentImage, true);
                    onClose();
                }}
                title="Restore with seed"
            >
                <i className="fa fa-undo"></i> <span className="btn-label">Restore</span>
            </button>
            <button
                className="image-btn secondary"
                onClick={() => {
                    onRestoreSettings(currentImage, false);
                    onClose();
                }}
                title="Restore without seed"
            >
                <i className="fa fa-random"></i> <span className="btn-label">New Seed</span>
            </button>
            <button
                className="image-btn danger"
                onClick={() => onDelete(currentImage.id)}
                title="Delete"
            >
                <i className="fa fa-trash"></i> <span className="btn-label">Delete</span>
            </button>
        </div>
    );
}
