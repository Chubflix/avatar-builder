'use client';

import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useQueueContext } from '../context/QueueContext';
import LocationPicker from './LocationPicker';
import MobileSlideout from './MobileSlideout';
import './MobilePromptSlideout.css';
import PromptAutocomplete from './PromptAutocomplete';
import { ToggleSwitch } from '@/app/design-system/atoms/ToggleSwitch';

function MobilePromptSlideout({ show, onClose, onGenerate }) {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const posRef = useRef(null);

    const {
        positivePrompt,
        batchSize,
        selectedFolder,
        folders,
        isGenerating,
        progress,
        selectedModel,
        tagAutocompleteEnabled
    } = state;
    const { count: queueCount } = useQueueContext();

    const handleGenerate = () => {
        onGenerate();
        onClose();
    };

    const selectedFolderName = selectedFolder
        ? folders.find(f => f.id === selectedFolder)?.name || 'Unfiled'
        : 'Unfiled';

    return (
        <>
            {/* Top Progress Bar */}
            {isGenerating && (
                <div className="mobile-top-progress" style={{ ['--progress']: `${progress}%` }}>
                    <div className="mobile-top-progress-fill"></div>
                </div>
            )}

            <MobileSlideout show={show} onClose={onClose} title="Generate Image">
                <div className="prompt-slideout-content">
                    {/* Positive Prompt - on mobile show Tag Bar above the prompt textarea */}
                    <div className="prompt-row">
                        <PromptAutocomplete
                            textareaRef={posRef}
                            value={positivePrompt}
                            onSelect={(text) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: text })}
                        />
                        <textarea
                            className="prompt-textarea"
                            ref={posRef}
                            value={positivePrompt}
                            onChange={(e) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: e.target.value })}
                            placeholder="Enter your prompt..."
                        />
                    </div>

                    {/* Auto Tagging Toggle Row */}
                    <div className="control-row" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                        <label style={{ margin: 0, fontSize: '0.95rem' }}>Auto Tagging</label>
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

                    {/* Folder Row */}
                    <div className="control-row">
                        <button
                            className="folder-select-btn"
                            onClick={() => setShowFolderSelector(true)}
                            type="button"
                        >
                            <i className="fa fa-folder"></i>
                            <span>{selectedFolderName}</span>
                            <i className="fa fa-chevron-down"></i>
                        </button>
                    </div>

                    {/* Batch Size + Generate Row */}
                    <div className="control-row">
                        <div className="batch-size-group">
                            <i className="fa fa-clone"></i>
                            <select
                                className="batch-select"
                                value={batchSize}
                                onChange={(e) => dispatch({ type: actions.SET_BATCH_SIZE, payload: parseInt(e.target.value) })}
                            >
                                {[...Array(10)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            className={`generate-btn ${isGenerating ? 'loading' : ''}`}
                            onClick={handleGenerate}
                            disabled={!selectedModel || isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="spinner"></div>
                                    {queueCount > 0 && (
                                        <span className="queue-count">{queueCount}</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <i className="fa fa-magic"></i>
                                    <span>Generate</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </MobileSlideout>

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
        </>
    );
}

export default MobilePromptSlideout;
