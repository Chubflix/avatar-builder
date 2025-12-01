import React, {useEffect, useRef, useState} from 'react';
import { useApp } from '../../context/AppContext';
import FormLabelInfo from '../FormLabelInfo';
import PromptAutocomplete from '../PromptAutocomplete';
import LocationPicker from '../LocationPicker';
import { ToggleSwitch } from '@/app/design-system/atoms/ToggleSwitch';
import {getCharacter} from "@/actions/character";

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
        selectedCharacter,
        folders,
        tagAutocompleteEnabled
    } = state;

    const [title, setTitle] = useState('Unfiled');

    useEffect(() => {
        const titleElements = [];
        if (selectedCharacter && selectedFolder) titleElements.push(selectedCharacter.name);
        if (selectedFolder) titleElements.push(folders.find(f => f.id === selectedFolder)?.name);

        setTitle(titleElements.join(' / ') || 'Unfiled');
    }, [selectedCharacter, selectedFolder, folders]);

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

            {/* Auto Tagging Toggle */}
            <div className="form-group">
                <div className="form-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-label" style={{ margin: 0 }}>Auto Tagging</label>
                    <ToggleSwitch
                        checked={tagAutocompleteEnabled}
                        onChange={() => dispatch({
                            type: actions.SET_TAG_AUTOCOMPLETE_ENABLED,
                            payload: !tagAutocompleteEnabled
                        })}
                        title="Toggle auto tagging"
                        ariaLabel="Toggle auto tagging"
                    />
                </div>
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
                        {title}
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
                onSelect={async (folderId) => {
                    dispatch({ type: actions.SET_SELECTED_FOLDER, payload: folderId });
                    let character = null;
                    const characterId = folders.find(f => f.id === folderId).character_id;
                    if (characterId) {
                        character = await getCharacter(characterId);
                    }

                    dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
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
