import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import FormLabelInfo from '../FormLabelInfo';
import PromptAutocomplete from '../PromptAutocomplete';
import LocationPicker from '../LocationPicker';

function BasicSettingsTab() {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const posRef = useRef(null);

    const {
        config,
        positivePrompt,
        orientation,
        batchSize,
        selectedFolder,
        folders
    } = state;

    if (!config) return null;

    return (
        <div className="tab-content">
            {/* Positive Prompt */}
            <div className="form-group">
                <FormLabelInfo
                    label="Positive Prompt"
                    alt="Test"
                    onClick={() => dispatch({ type: actions.SET_SHOW_PROMPT_MODAL, payload: true })}
                />
                <textarea
                    className="form-textarea"
                    ref={posRef}
                    value={positivePrompt}
                    onChange={(e) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: e.target.value })}
                    placeholder="masterpiece, best quality, 1girl, portrait..."
                />
                <PromptAutocomplete
                    textareaRef={posRef}
                    value={positivePrompt}
                    onSelect={(text) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: text })}
                />
            </div>

            {/* Save to Folder */}
            <div className="form-group">
                <label className="form-label">Save to Folder</label>
                <button
                    className="folder-select-display-btn"
                    onClick={() => setShowFolderSelector(true)}
                    type="button"
                >
                    <i className="fa fa-folder"></i>
                    <span>
                        {selectedFolder ?
                            folders.find(f => f.id === selectedFolder)?.name || 'Unfiled'
                            : 'Unfiled'}
                    </span>
                    <i className="fa fa-chevron-down"></i>
                </button>
            </div>

            {/* Orientation & Batch Size */}
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Orientation</label>
                    <div className="toggle-group">
                        <button
                            className={`toggle-option ${orientation === 'portrait' ? 'active' : ''}`}
                            onClick={() => dispatch({ type: actions.SET_ORIENTATION, payload: 'portrait' })}
                        >
                            Portrait
                        </button>
                        <button
                            className={`toggle-option ${orientation === 'landscape' ? 'active' : ''}`}
                            onClick={() => dispatch({ type: actions.SET_ORIENTATION, payload: 'landscape' })}
                        >
                            Landscape
                        </button>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Batch Size</label>
                    <select
                        className="form-select"
                        value={batchSize}
                        onChange={(e) => dispatch({ type: actions.SET_BATCH_SIZE, payload: parseInt(e.target.value) })}
                    >
                        {[...Array(10)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Location Picker Modal */}
            <LocationPicker
                show={showFolderSelector}
                onClose={() => setShowFolderSelector(false)}
                onSelect={(folderId) => {
                    dispatch({ type: actions.SET_SELECTED_FOLDER, payload: folderId });
                    setShowFolderSelector(false);
                }}
                currentFolderId={selectedFolder}
                currentCharacterId={
                    selectedFolder
                        ? folders.find(f => f.id === selectedFolder)?.character_id
                        : null
                }
                title="Save to Folder"
                mode="save"
            />
        </div>
    );
}

export default BasicSettingsTab;
