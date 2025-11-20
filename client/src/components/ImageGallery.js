import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { imageAPI, API_BASE } from '../api/backend';
import FolderSelector from './FolderSelector';

function ImageGallery({ onOpenLightbox, onRestoreSettings, onDelete }) {
    const { state, dispatch, actions } = useApp();
    const { images, totalImages, hasMore, isLoadingMore } = state;
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedImageForMove, setSelectedImageForMove] = useState(null);
    const [showMoveAction, setShowMoveAction] = useState(false);

    const handleDownload = (e, image) => {
        e.stopPropagation();
        imageAPI.download(image);
    };

    const handleRestoreWithSeed = (e, image) => {
        e.stopPropagation();
        onRestoreSettings(image, true);
    };

    const handleRestoreWithoutSeed = (e, image) => {
        e.stopPropagation();
        onRestoreSettings(image, false);
    };

    const handleDelete = (e, imageId) => {
        e.stopPropagation();
        onDelete(imageId);
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

    return (
        <>
            <div className="image-grid">
                {images.map((image, index) => {
                    const imageSrc = `${API_BASE}${image.url || `/generated/${image.filename}`}`;
                    return (
                        <div key={image.id} className="image-card">
                            <div
                                className="image-wrapper"
                                style={{ '--bg-image': `url(${imageSrc})` }}
                                onClick={() => onOpenLightbox(index)}
                            >
                                <img
                                    src={imageSrc}
                                    alt={`Generated ${image.id}`}
                                    loading="lazy"
                                />
                            <div className="image-overlay">
                                <button
                                    className="image-btn"
                                    onClick={(e) => handleDownload(e, image)}
                                    title="Download"
                                >
                                    <i className="fa fa-download"></i>
                                </button>
                                <button
                                    className="image-btn secondary"
                                    onClick={(e) => handleRestoreWithSeed(e, image)}
                                    title="Restore with seed"
                                >
                                    <i className="fa fa-undo"></i>
                                </button>
                                <button
                                    className="image-btn secondary"
                                    onClick={(e) => handleRestoreWithoutSeed(e, image)}
                                    title="Restore without seed"
                                >
                                    <i className="fa fa-random"></i>
                                </button>
                                <button
                                    className="image-btn danger"
                                    onClick={(e) => handleDelete(e, image.id)}
                                    title="Delete"
                                >
                                    <i className="fa fa-trash"></i>
                                </button>
                            </div>
                        </div>
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
                                    {image.folder_path.split(' / ').map((folderName, index, array) => {
                                        const isLast = index === array.length - 1;
                                        return (
                                            <React.Fragment key={index}>
                                                <div className={`image-folder-badge-split ${!isLast ? 'path-part' : ''}`}>
                                                    <button
                                                        className="folder-badge-filter"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Find folder by matching the name at this depth
                                                            const pathUpToHere = array.slice(0, index + 1);
                                                            const folder = state.folders.find(f => {
                                                                // Build path for this folder and check if it matches
                                                                const folderPathParts = [];
                                                                let currentId = f.id;
                                                                const folderMap = new Map(state.folders.map(folder => [folder.id, folder]));
                                                                while (currentId) {
                                                                    const currentFolder = folderMap.get(currentId);
                                                                    if (!currentFolder) break;
                                                                    folderPathParts.unshift(currentFolder.name);
                                                                    currentId = currentFolder.parent_id;
                                                                }
                                                                return folderPathParts.join(' / ') === pathUpToHere.join(' / ');
                                                            });
                                                            if (folder) {
                                                                dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folder.id });
                                                            }
                                                        }}
                                                        title={`Filter by ${folderName}`}
                                                    >
                                                        {folderName}
                                                    </button>
                                                    {isLast && (
                                                        <button
                                                            className="folder-badge-move"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedImageForMove(image);
                                                                setShowFolderSelector(true);
                                                            }}
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
                            ) : (
                                // Unfiled badge
                                <div className="image-folder-badge-split unfiled">
                                    <button
                                        className="folder-badge-filter"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: 'unfiled' });
                                        }}
                                        title="Filter unfiled images"
                                    >
                                        Unfiled
                                    </button>
                                    <button
                                        className="folder-badge-move"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageForMove(image);
                                            setShowFolderSelector(true);
                                        }}
                                        title="Move to folder"
                                    >
                                        <i className="fa fa-folder-o"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="btn-load-more"
                        onClick={() => {/* will be handled in parent */}}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? (
                            <>
                                <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', marginRight: '8px', verticalAlign: 'middle' }}></span>
                                Loading...
                            </>
                        ) : (
                            `Load More (${totalImages - images.length} remaining)`
                        )}
                    </button>
                </div>
            )}

            <FolderSelector
                show={showFolderSelector}
                onClose={() => {
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                }}
                onSelect={async (folderId) => {
                    if (selectedImageForMove) {
                        await imageAPI.update(selectedImageForMove.id, { folderId: folderId || null });
                        window.location.reload();
                    }
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                }}
                currentFolderId={selectedImageForMove?.folder_id}
                title="Move to Folder"
            />
        </>
    );
}

export default ImageGallery;
