import React, {useState} from 'react';
import LocationPicker from './LocationPicker';
import ImageCard from './ImageCard';

/**
 * Presentational component for displaying image gallery.
 * All state and API logic is handled by the parent container.
 */
function ImageGallery({
    images,
    filteredImages,
    totalImages,
    hasMore,
    isLoadingMore,
    selectedImages,
    isSelecting,
    hideNsfw,
    showFavoritesOnly,
    lastClickedIndex,
    showImageInfo,
    folders,
    characters,
    onOpenLightbox,
    onRestoreSettings,
    onDelete,
    onLoadMore,
    onImageMove,
    onToggleSelecting,
    onToggleFavoritesOnly,
    onSelectAll,
    onClearSelection,
    onBulkDownload,
    onBulkDelete,
    onBulkMove,
    onBulkSetNSFW,
    onDownload,
    onToggleSelection,
    onToggleFavoriteOnCard,
    onToggleNsfwOnCard,
    onFilterByFolder,
    onFilterByCharacter,
    onFilterUnfiled
}) {
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedImageForMove, setSelectedImageForMove] = useState(null);
    const [bulkMoveMode, setBulkMoveMode] = useState(false);

    const handleBulkMoveClick = () => {
        setBulkMoveMode(true);
        setShowFolderSelector(true);
    };

    if (images.length === 0) {
        return (
            <div className="empty-state">
                <i className="fa fa-image"></i>
                <h3>No images yet</h3>
                <p>Configure your settings and click Generate to create images</p>
            </div>
        );
    }

    if (filteredImages.length === 0 && hideNsfw) {
        return (
            <div className="empty-state">
                <i className="fa fa-eye-slash"></i>
                <h3>All images are hidden</h3>
                <p>All images are marked as NSFW. Disable "Hide NSFW Images" in settings to view them.</p>
            </div>
        );
    }

    if (filteredImages.length === 0 && showFavoritesOnly) {
        return (
            <div className="empty-state">
                <i className="fa fa-heart-o"></i>
                <h3>No favorite images</h3>
                <p>Mark images as favorites to see them here.</p>
            </div>
        );
    }

    return (
        <>
            {/* Selection Toolbar */}
            <div className="selection-toolbar">
                {!isSelecting ? (
                    <>
                        <button
                            className="btn-select"
                            onClick={() => onToggleSelecting(true)}
                        >
                            <i className="fa fa-check-square-o"></i>
                            Select
                        </button>
                        <button
                            className={`btn-filter ${showFavoritesOnly ? 'active' : ''}`}
                            onClick={onToggleFavoritesOnly}
                            title={showFavoritesOnly ? 'Show all images' : 'Show favorites only'}
                        >
                            <i className={`fa ${showFavoritesOnly ? 'fa-heart' : 'fa-heart-o'}`}></i>
                            Favorites Only
                        </button>
                    </>
                ) : (
                    <>
                        <div className="selection-info">
                            <span className="selection-count">
                                {selectedImages.length} selected
                            </span>
                        </div>
                        <div className="selection-actions">
                            <button
                                className="btn-selection-action"
                                onClick={onSelectAll}
                                disabled={selectedImages.length === images.length}
                            >
                                <i className="fa fa-check-square"></i>
                                Select All
                            </button>
                            {selectedImages.length > 0 && (
                                <>
                                    <button
                                        className="btn-selection-action"
                                        onClick={onBulkDownload}
                                    >
                                        <i className="fa fa-download"></i>
                                        Download
                                    </button>
                                    <div className="btn-selection-action" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <label htmlFor="bulk-nsfw" style={{ fontSize: 12, opacity: 0.8 }}>NSFW:</label>
                                        <select
                                            id="bulk-nsfw"
                                            className="form-input"
                                            style={{ padding: '4px 6px', height: 28 }}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'nsfw') {
                                                    onBulkSetNSFW(true);
                                                } else if (val === 'sfw') {
                                                    onBulkSetNSFW(false);
                                                }
                                                // reset selection back to placeholder
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">Set NSFW…</option>
                                            <option value="nsfw">Mark as NSFW</option>
                                            <option value="sfw">Mark as SFW</option>
                                        </select>
                                    </div>
                                    <button
                                        className="btn-selection-action"
                                        onClick={handleBulkMoveClick}
                                    >
                                        <i className="fa fa-folder-o"></i>
                                        Move
                                    </button>
                                    <button
                                        className="btn-selection-action danger"
                                        onClick={onBulkDelete}
                                    >
                                        <i className="fa fa-trash"></i>
                                        Delete
                                    </button>
                                </>
                            )}
                            <button
                                className="btn-selection-action"
                                onClick={onClearSelection}
                            >
                                <i className="fa fa-times"></i>
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="image-grid">
                {filteredImages.map((image, filteredIndex) => {
                    // Find the actual index in the original images array
                    const actualIndex = images.findIndex(img => img.id === image.id);
                    return <ImageCard
                        key={image.id}
                        index={actualIndex}
                        image={image}
                        selectedImages={selectedImages}
                        isSelecting={isSelecting}
                        lastClickedIndex={lastClickedIndex}
                        showImageInfo={showImageInfo}
                        folders={folders}
                        characters={characters}
                        onRestoreSettings={onRestoreSettings}
                        onOpenLightbox={onOpenLightbox}
                        onDelete={onDelete}
                        onDownload={onDownload}
                        onToggleSelection={onToggleSelection}
                        onToggleFavorite={onToggleFavoriteOnCard}
                        onToggleNsfw={onToggleNsfwOnCard}
                        onFilterByFolder={onFilterByFolder}
                        onFilterByCharacter={onFilterByCharacter}
                        onFilterUnfiled={onFilterUnfiled}
                        onImageMove={(e, image) => {
                            e.stopPropagation();
                            setSelectedImageForMove(image);
                            setShowFolderSelector(true);
                        }}
                    />;
                })}
            </div>

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="btn-load-more"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? (
                            <>
                                <span className="spinner" style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    marginRight: '8px',
                                    verticalAlign: 'middle'
                                }}></span>
                                Loading...
                            </>
                        ) : (
                            `Load More (${totalImages - images.length} remaining)`
                        )}
                    </button>
                </div>
            )}

            <LocationPicker
                show={showFolderSelector}
                onClose={() => {
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                    setBulkMoveMode(false);
                }}
                onSelect={(folderId) => {
                    if (bulkMoveMode) {
                        onBulkMove(folderId || null);
                    } else if (selectedImageForMove) {
                        onImageMove(selectedImageForMove, folderId || null);
                    }
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                    setBulkMoveMode(false);
                }}
                currentFolderId={bulkMoveMode ? null : selectedImageForMove?.folder_id}
                currentCharacterId={bulkMoveMode ? null : selectedImageForMove?.character_id}
                title={bulkMoveMode ? `Move ${selectedImages.length} Images` : "Move to Folder"}
                mode="move"
            />
        </>
    );
}

export default ImageGallery;
