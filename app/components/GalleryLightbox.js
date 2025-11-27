'use client';

import { useState } from 'react';
import Lightbox from './Lightbox';

/**
 * GalleryLightbox - Specific lightbox implementation for the image gallery
 * Manages local UI state (folder selector, comparison) and composes lightbox sub-components
 */
function GalleryLightbox({
    // Data props passed to LightboxProvider
    images,
    filteredImages,
    currentImage,
    filteredLightboxIndex,
    lightboxIndex,
    hasMore,
    isLoadingMore,
    onClose,
    onNavigate,
    onLoadMore,

    // Handler props for sub-components
    onToggleFavorite,
    onToggleNsfw,
    onSetModel,
    onMoveToFolder,
    onDownload,
    onCopyToClipboard,
    onSetInitImage,
    onStartInpaint,
    onRestoreSettings,
    onDelete
}) {
    // Local UI state for optional features
    const [showFolderSelector, setShowFolderSelector] = useState(false);

    return (
        <Lightbox
            images={images}
            filteredImages={filteredImages}
            currentImage={currentImage}
            filteredLightboxIndex={filteredLightboxIndex}
            lightboxIndex={lightboxIndex}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onClose={onClose}
            onNavigate={onNavigate}
            onLoadMore={onLoadMore}
        >
            <Lightbox.Overlay>
                <Lightbox.Content>
                    <Lightbox.FlagControls
                        onToggleFavorite={onToggleFavorite}
                        onToggleNsfw={onToggleNsfw}
                    />
                    <Lightbox.Controls showComparisonButton={true}>
                        <Lightbox.Comparison />
                    </Lightbox.Controls>
                    <Lightbox.Navigation />

                    <div className="lightbox-main-content">
                        <Lightbox.Image />
                        <Lightbox.Details onSetModel={onSetModel} />
                    </div>

                    <div className="lightbox-content-wrapper">
                        <Lightbox.Info>
                            <div className="lightbox-folder-info">
                                <button
                                    className="folder-select-btn"
                                    onClick={() => setShowFolderSelector(true)}
                                >
                                    {currentImage?.folder_path || 'Unfiled'}
                                    <i className="fa fa-chevron-down"></i>
                                </button>
                            </div>
                        </Lightbox.Info>
                        <Lightbox.Actions
                            onDownload={onDownload}
                            onCopyToClipboard={onCopyToClipboard}
                            onSetInitImage={onSetInitImage}
                            onStartInpaint={onStartInpaint}
                            onRestoreSettings={onRestoreSettings}
                            onDelete={onDelete}
                        />
                    </div>
                </Lightbox.Content>

                <Lightbox.LocationPicker
                    onMoveToFolder={onMoveToFolder}
                    show={showFolderSelector}
                    onClose={() => setShowFolderSelector(false)}
                />
            </Lightbox.Overlay>
        </Lightbox>
    );
}

export default GalleryLightbox;
