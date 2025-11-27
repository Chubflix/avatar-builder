import React from 'react';

/**
 * Presentational component for displaying an image card.
 * All state and API logic is handled by the parent container.
 */
function ImageCard({
    image,
    index,
    selectedImages,
    isSelecting,
    lastClickedIndex,
    showImageInfo,
    folders,
    characters,
    onOpenLightbox,
    onRestoreSettings,
    onDelete,
    onImageMove,
    onDownload,
    onToggleSelection,
    onToggleFavorite,
    onToggleNsfw,
    onFilterByFolder,
    onFilterByCharacter,
    onFilterUnfiled
}) {
    const isSelected = selectedImages.includes(image.id);

    const handleDownload = (e) => {
        e.stopPropagation();
        onDownload(image);
    };

    const handleRestoreWithSeed = (e) => {
        e.stopPropagation();
        onRestoreSettings(image, true);
    };

    const handleRestoreWithoutSeed = (e) => {
        e.stopPropagation();
        onRestoreSettings(image, false);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(image.id);
    };

    const handleToggleSelection = (e) => {
        e.stopPropagation();
        onToggleSelection(image.id, index, e.shiftKey);
    };

    const handleToggleFavorite = (e) => {
        e.stopPropagation();
        onToggleFavorite(image);
    };

    const handleToggleNsfw = (e) => {
        e.stopPropagation();
        onToggleNsfw(image);
    };

    return (
        <div className={`image-card ${isSelected ? 'selected' : ''}`}>
            <div
                className="image-wrapper"
                style={{'--bg-image': `url(${image.url})`}}
                onClick={(e) => isSelecting ? handleToggleSelection(e) : onOpenLightbox(index)}
            >
                {isSelecting && (
                    <div className="image-checkbox">
                        <i className={`fa ${isSelected ? 'fa-dot-circle-o' : 'fa-circle-o'}`}/>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={handleToggleSelection}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
                {!isSelecting && (
                    <div className="image-flags">
                        <button
                            className={`flag-btn favorite-btn ${image.is_favorite ? 'active' : ''}`}
                            onClick={handleToggleFavorite}
                            title={image.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <i className={`fa ${image.is_favorite ? 'fa-heart' : 'fa-heart-o'}`}></i>
                        </button>
                        <button
                            className={`flag-btn nsfw-btn ${image.is_nsfw ? 'active' : ''}`}
                            onClick={handleToggleNsfw}
                            title={image.is_nsfw ? 'Mark as SFW' : 'Mark as NSFW'}
                        >
                            <i className={`fa ${image.is_nsfw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                )}
                <img
                    src={image.url}
                    alt={`Generated ${image.id}`}
                    loading="lazy"
                />
                {!isSelecting && <div className="image-overlay">
                    <button
                        className="image-btn"
                        onClick={handleDownload}
                        title="Download"
                    >
                        <i className="fa fa-download"></i>
                    </button>
                    <button
                        className="image-btn secondary"
                        onClick={handleRestoreWithSeed}
                        title="Restore with seed"
                    >
                        <i className="fa fa-undo"></i>
                    </button>
                    <button
                        className="image-btn secondary"
                        onClick={handleRestoreWithoutSeed}
                        title="Restore without seed"
                    >
                        <i className="fa fa-random"></i>
                    </button>
                    <button
                        className="image-btn danger"
                        onClick={handleDelete}
                        title="Delete"
                    >
                        <i className="fa fa-trash"></i>
                    </button>
                </div>}
            </div>
            {showImageInfo && (
                <>
                    <div className="image-info">
                        {new Date(image.created_at).toLocaleString()}
                        {image.seed && image.seed !== -1 && (
                            <span> • Seed: {image.seed}</span>
                        )}
                    </div>
                    <div className="image-tags">
                {image.folder_path ? (
                    // Split path into individual badges with separators
                    <>
                        {image.folder_path.split(' / ').map((folderName, idx, array) => {
                            const isLast = idx === array.length - 1;
                            return (
                                <React.Fragment key={idx}>
                                    <div className={`image-folder-badge-split ${!isLast ? 'path-part' : ''}`}>
                                        <button
                                            className="folder-badge-filter"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Find folder by matching the name at this depth
                                                const pathUpToHere = array.slice(0, idx + 1);
                                                const folder = folders.find(f => {
                                                    // Build path for this folder and check if it matches
                                                    const folderPathParts = [];
                                                    let currentId = f.id;
                                                    const folderMap = new Map(folders.map(folder => [folder.id, folder]));
                                                    while (currentId) {
                                                        const currentFolder = folderMap.get(currentId);
                                                        if (!currentFolder) break;
                                                        folderPathParts.unshift(currentFolder.name);
                                                        currentId = currentFolder.parent_id;
                                                    }
                                                    return folderPathParts.join(' / ') === pathUpToHere.join(' / ');
                                                });
                                                if (folder) {
                                                    onFilterByFolder(folder.id);
                                                }
                                            }}
                                            title={`Filter by ${folderName}`}
                                        >
                                            {folderName}
                                        </button>
                                        {isLast && (
                                            <button
                                                className="folder-badge-move"
                                                onClick={(e) => onImageMove(e, image)}
                                                title="Move to folder"
                                            >
                                                <i className="fa fa-folder-o"></i>
                                            </button>
                                        )}
                                    </div>
                                    {!isLast && <span className="folder-path-separator">/</span>}
                                </React.Fragment>
                            );
                        })}
                    </>
                ) : image.character_id ? (
                    // Character badge (unfiled character image)
                    <div className="image-folder-badge-split unfiled">
                        <button
                            className="folder-badge-filter"
                            onClick={(e) => {
                                e.stopPropagation();
                                const character = characters.find(c => c.id === image.character_id);
                                if (character) {
                                    onFilterByCharacter(character);
                                }
                            }}
                            title="Filter by character"
                        >
                            {characters.find(c => c.id === image.character_id)?.name || 'Character'}
                        </button>
                        <button
                            className="folder-badge-move"
                            onClick={(e) => onImageMove(e, image)}
                            title="Move to folder"
                        >
                            <i className="fa fa-folder-o"></i>
                        </button>
                    </div>
                ) : (
                    // Truly unfiled badge (no character, no folder)
                    <div className="image-folder-badge-split unfiled">
                        <button
                            className="folder-badge-filter"
                            onClick={(e) => {
                                e.stopPropagation();
                                onFilterUnfiled();
                            }}
                            title="Filter unfiled images"
                        >
                            Unfiled
                        </button>
                        <button
                            className="folder-badge-move"
                            onClick={(e) => onImageMove(e, image)}
                            title="Move to folder"
                        >
                            <i className="fa fa-folder-o"></i>
                        </button>
                    </div>
                )}
                    </div>
                </>
            )}
        </div>
    );
}

export default ImageCard;