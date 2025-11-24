'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useQueueContext } from '../context/QueueContext';
import { useQueue } from "@/app/hooks/queue";
import FolderSelector from './FolderSelector';
import MobileSlideout from './MobileSlideout';
import './MobilePromptSlideout.css';

function MobilePromptSlideout({ show, onClose, onGenerate }) {
    const { state, dispatch, actions } = useApp();
    const [showFolderSelector, setShowFolderSelector] = useState(false);

    const {
        positivePrompt,
        batchSize,
        selectedFolder,
        folders,
        isGenerating,
        progress,
        selectedModel
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
                <div className="mobile-top-progress">
                    <div className="mobile-top-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <MobileSlideout show={show} onClose={onClose} title="Generate Image">
                <div className="prompt-slideout-content">
                    {/* Positive Prompt - takes remaining space */}
                    <div className="prompt-row">
                        <textarea
                            className="prompt-textarea"
                            value={positivePrompt}
                            onChange={(e) => dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: e.target.value })}
                            placeholder="Enter your prompt..."
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

            {/* Folder Selector Modal */}
            <FolderSelector
                show={showFolderSelector}
                onClose={() => setShowFolderSelector(false)}
                onSelect={(folderId) => {
                    dispatch({ type: actions.SET_SELECTED_FOLDER, payload: folderId });
                    setShowFolderSelector(false);
                }}
                currentFolderId={selectedFolder}
                title="Save to Folder"
            />
        </>
    );
}

export default MobilePromptSlideout;
