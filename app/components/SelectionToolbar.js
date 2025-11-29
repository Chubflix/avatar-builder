import React from 'react';

/**
 * Selection toolbar for image gallery.
 * Displays select/favorites buttons in normal mode,
 * and bulk actions when in selection mode.
 */
function SelectionToolbar({
    isSelecting,
    selectedImages,
    totalImages,
    showFavoritesOnly,
    onToggleSelecting,
    onToggleFavoritesOnly,
    onSelectAll,
    onClearSelection,
    onBulkDownload,
    onBulkDelete,
    onBulkMove,
    onBulkSetNSFW
}) {
    return (
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
                            disabled={selectedImages.length === totalImages}
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
                                    onClick={onBulkMove}
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
    );
}

export default SelectionToolbar;
