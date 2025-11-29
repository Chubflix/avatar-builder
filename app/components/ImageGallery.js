import React, {useState} from 'react';
import LocationPicker from './LocationPicker';
import ImageCard from './ImageCard';
import SelectionToolbar from './SelectionToolbar';

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

    const selectionToolbar = (
        <SelectionToolbar
            isSelecting={isSelecting}
            selectedImages={selectedImages}
            totalImages={images.length}
            showFavoritesOnly={showFavoritesOnly}
            onToggleSelecting={onToggleSelecting}
            onToggleFavoritesOnly={onToggleFavoritesOnly}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
            onBulkDownload={onBulkDownload}
            onBulkDelete={onBulkDelete}
            onBulkMove={handleBulkMoveClick}
            onBulkSetNSFW={onBulkSetNSFW}
        />
    );

    const loadMore = hasMore && (

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
    );

    if (images.length === 0) {
        return (
            <>
                {selectionToolbar}
                <div className="empty-state">
                    <i className="fa fa-image"></i>
                    <h3>No images yet</h3>
                    <p>Configure your settings and click Generate to create images</p>
                </div>
                {loadMore}
            </>
        );
    }

    if (filteredImages.length === 0 && hideNsfw) {
        return (
            <>
                {selectionToolbar}
                <div className="empty-state">
                    <i className="fa fa-eye-slash"></i>
                    <h3>All images are hidden</h3>
                    <p>All images are marked as NSFW. Disable "Hide NSFW Images" in settings to view them.</p>
                </div>
                {loadMore}
            </>
        );
    }

    if (filteredImages.length === 0 && showFavoritesOnly) {
        return (
            <>
                {selectionToolbar}
                <div className="empty-state">
                    <i className="fa fa-heart-o"></i>
                    <h3>No favorite images</h3>
                    <p>Mark images as favorites to see them here.</p>
                </div>
                {loadMore}
            </>
        );
    }

    return (
        <>
            {selectionToolbar}
            <div className="image-grid">
                {filteredImages.map((image) => {
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

            {loadMore}

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
