import React from 'react';
import {useApp} from '../context/AppContext';
import {imageAPI, API_BASE} from '../utils/backend-api';

function ImageCard({image, onOpenLightbox, onRestoreSettings, onDelete, onImageMove, index}) {
    const {state, dispatch, actions} = useApp();
    const {selectedImages, isSelecting, lastClickedIndex, showImageInfo} = state;

    const imageSrc = `${API_BASE}${image.url || `/generated/${image.filename}`}`;
    const isSelected = selectedImages.includes(image.id);

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

    const handleToggleSelection = (e, imageId, imageIndex) => {
        e.stopPropagation();

        // Check if shift key is pressed and we have a previous click
        if (e.shiftKey && lastClickedIndex !== null) {
            // Select range from lastClickedIndex to current index
            dispatch({
                type: actions.SELECT_IMAGE_RANGE,
                payload: { startIndex: lastClickedIndex, endIndex: imageIndex }
            });
        } else {
            // Normal toggle
            dispatch({type: actions.TOGGLE_IMAGE_SELECTION, payload: imageId});
        }

        // Update last clicked index
        dispatch({type: actions.SET_LAST_CLICKED_INDEX, payload: imageIndex});
    };

    const handleToggleFavorite = async (e) => {
        e.stopPropagation();
        try {
            const updatedImage = await imageAPI.updateFlags(image.id, {
                is_favorite: !image.is_favorite
            });
            dispatch({ type: actions.UPDATE_IMAGE, payload: updatedImage });
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to update favorite' }
            });
        }
    };

    const handleToggleNsfw = async (e) => {
        e.stopPropagation();
        try {
            const updatedImage = await imageAPI.updateFlags(image.id, {
                is_nsfw: !image.is_nsfw
            });
            dispatch({ type: actions.UPDATE_IMAGE, payload: updatedImage });
        } catch (error) {
            console.error('Failed to toggle NSFW:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to update NSFW flag' }
            });
        }
    };

    return (
        <div className={`image-card ${isSelected ? 'selected' : ''}`}>
            <div
                className="image-wrapper"
                style={{'--bg-image': `url(${imageSrc})`}}
                onClick={(e) => isSelecting ? handleToggleSelection(e, image.id, index) : onOpenLightbox(index)}
            >
                {isSelecting && (
                    <div className="image-checkbox">
                        <i className={`fa ${isSelected ? 'fa-dot-circle-o' : 'fa-circle-o'}`}/>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelection(e, image.id, index)}
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
                    src={imageSrc}
                    alt={`Generated ${image.id}`}
                    loading="lazy"
                />
                {!isSelecting && <div className="image-overlay">
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
                                                    dispatch({type: actions.SET_CURRENT_FOLDER, payload: folder.id});
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
                                const character = state.characters.find(c => c.id === image.character_id);
                                if (character) {
                                    dispatch({type: actions.SET_SELECTED_CHARACTER, payload: character});
                                    dispatch({type: actions.SET_CURRENT_FOLDER, payload: null});
                                }
                            }}
                            title="Filter by character"
                        >
                            {state.characters.find(c => c.id === image.character_id)?.name || 'Character'}
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
                                dispatch({type: actions.SET_CURRENT_FOLDER, payload: 'unfiled'});
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