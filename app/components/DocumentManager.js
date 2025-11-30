'use client';

import React, { useState, useEffect } from 'react';
import './DocumentManager.css';

/**
 * DocumentManager Component
 * Manages character-specific documents for RAG
 */
export default function DocumentManager({ characterId, characterName }) {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [error, setError] = useState(null);

    // Form states
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isGlobal, setIsGlobal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMode, setUploadMode] = useState('text'); // 'text' or 'file'
    const [expandedGroups, setExpandedGroups] = useState(new Set());

    // Load documents when character changes
    useEffect(() => {
        if (characterId) {
            loadDocuments();
        } else {
            setDocuments([]);
        }
    }, [characterId]);

    const loadDocuments = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/documents?character_id=${characterId}`);
            if (!response.ok) {
                throw new Error('Failed to load documents');
            }
            const data = await response.json();
            setDocuments(data);
        } catch (err) {
            console.error('Error loading documents:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Group chunked documents together
    const groupDocuments = (docs) => {
        const groups = [];
        const processedIds = new Set();

        docs.forEach(doc => {
            if (processedIds.has(doc.id)) return;

            // Check if this is a chunked document
            const isChunked = doc.metadata?.total_chunks > 1;

            if (isChunked) {
                const originalTitle = doc.metadata.original_title || doc.title;

                // Find all chunks with the same original title
                const chunks = docs.filter(d =>
                    d.metadata?.original_title === originalTitle ||
                    (d.metadata?.original_title === originalTitle && d.metadata?.total_chunks > 1)
                ).sort((a, b) => (a.metadata?.chunk_index || 0) - (b.metadata?.chunk_index || 0));

                // Mark all chunks as processed
                chunks.forEach(chunk => processedIds.add(chunk.id));

                // Create a group
                groups.push({
                    id: `group-${doc.id}`,
                    title: originalTitle,
                    isGroup: true,
                    chunks: chunks,
                    is_global: doc.is_global,
                    filename: doc.filename,
                    totalChunks: doc.metadata.total_chunks,
                });
            } else {
                // Regular document
                processedIds.add(doc.id);
                groups.push({
                    ...doc,
                    isGroup: false,
                });
            }
        });

        return groups;
    };

    const handleCreate = async () => {
        // Validation
        if (uploadMode === 'file') {
            if (!selectedFile) {
                alert('Please select a file to upload');
                return;
            }
        } else {
            if (!title.trim() || !content.trim()) {
                alert('Please enter both title and content');
                return;
            }
        }

        try {
            setError(null);
            let response;

            if (uploadMode === 'file') {
                // File upload mode - use FormData
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('character_id', isGlobal ? '' : characterId);
                formData.append('title', title.trim() || ''); // Title is optional for files
                formData.append('is_global', isGlobal.toString());
                formData.append('use_chunking', 'true'); // Auto-chunk uploaded files

                response = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                // Text mode - use JSON
                response = await fetch('/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        character_id: isGlobal ? null : characterId,
                        title: title.trim(),
                        content: content.trim(),
                        is_global: isGlobal,
                        use_chunking: content.length > 1000,
                    }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create document');
            }

            await loadDocuments();
            setIsCreating(false);
            setTitle('');
            setContent('');
            setSelectedFile(null);
            setIsGlobal(false);
            setUploadMode('text');
        } catch (err) {
            console.error('Error creating document:', err);
            setError(err.message);
        }
    };

    const handleUpdate = async (documentId) => {
        if (!title.trim() || !content.trim()) {
            alert('Please enter both title and content');
            return;
        }

        try {
            setError(null);
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update document');
            }

            await loadDocuments();
            setIsEditing(null);
            setTitle('');
            setContent('');
        } catch (err) {
            console.error('Error updating document:', err);
            setError(err.message);
        }
    };

    const handleDelete = async (documentId) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            setError(null);
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            await loadDocuments();
        } catch (err) {
            console.error('Error deleting document:', err);
            setError(err.message);
        }
    };

    const startEdit = (doc) => {
        setIsEditing(doc.id);
        setTitle(doc.title);
        setContent(doc.content);
        setIsCreating(false);
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setIsCreating(false);
        setTitle('');
        setContent('');
        setSelectedFile(null);
        setIsGlobal(false);
        setUploadMode('text');
        setError(null);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Auto-fill title from filename if empty
            if (!title.trim()) {
                setTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const handleDeleteGroup = async (chunks) => {
        if (!confirm(`Are you sure you want to delete this document and all its ${chunks.length} chunks?`)) {
            return;
        }

        try {
            setError(null);
            // Delete all chunks
            await Promise.all(chunks.map(chunk =>
                fetch(`/api/documents/${chunk.id}`, { method: 'DELETE' })
            ));
            await loadDocuments();
        } catch (err) {
            console.error('Error deleting document group:', err);
            setError(err.message);
        }
    };

    if (!characterId) {
        return null;
    }

    return (
        <div className="document-manager">
            <div className="document-manager-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="document-manager-header-content">
                    <i className={`fa fa-${isExpanded ? 'chevron-down' : 'chevron-right'}`}></i>
                    <i className="fa fa-file-text"></i>
                    <span>Character Documents ({documents.length})</span>
                </div>
                {!isExpanded && documents.length === 0 && (
                    <span className="document-manager-hint">Add context for AI</span>
                )}
            </div>

            {isExpanded && (
                <div className="document-manager-content">
                    {error && (
                        <div className="document-manager-error">
                            <i className="fa fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="document-manager-loading">
                            <div className="spinner"></div>
                            <p>Loading documents...</p>
                        </div>
                    ) : (
                        <>
                            {!isCreating && !isEditing && (
                                <button
                                    className="document-add-btn"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <i className="fa fa-plus"></i>
                                    Add Document
                                </button>
                            )}

                            {(isCreating || isEditing) && (
                                <div className="document-form">
                                    {isCreating && !isEditing && (
                                        <div className="document-form-mode-toggle">
                                            <button
                                                className={`mode-toggle-btn ${uploadMode === 'text' ? 'active' : ''}`}
                                                onClick={() => setUploadMode('text')}
                                            >
                                                <i className="fa fa-keyboard-o"></i>
                                                Text
                                            </button>
                                            <button
                                                className={`mode-toggle-btn ${uploadMode === 'file' ? 'active' : ''}`}
                                                onClick={() => setUploadMode('file')}
                                            >
                                                <i className="fa fa-upload"></i>
                                                Upload File
                                            </button>
                                        </div>
                                    )}

                                    {uploadMode === 'file' && isCreating && !isEditing && (
                                        <div className="document-file-upload">
                                            <input
                                                type="file"
                                                id="doc-file-input"
                                                accept=".txt,.md,.markdown,.json"
                                                onChange={handleFileSelect}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="doc-file-input" className="file-upload-label">
                                                <i className="fa fa-cloud-upload"></i>
                                                {selectedFile ? selectedFile.name : 'Choose file...'}
                                            </label>
                                            {selectedFile && (
                                                <div className="file-upload-info">
                                                    <i className="fa fa-file-o"></i>
                                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        className="document-form-input"
                                        placeholder={uploadMode === 'file' ? 'Document title (optional - uses filename)' : 'Document title'}
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />

                                    {uploadMode === 'text' && (
                                        <textarea
                                            className="document-form-textarea"
                                            placeholder="Document content (markdown supported)"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            rows={10}
                                        />
                                    )}

                                    {isCreating && !isEditing && (
                                        <div className="document-form-checkbox">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={isGlobal}
                                                    onChange={(e) => setIsGlobal(e.target.checked)}
                                                />
                                                <span>
                                                    <i className="fa fa-globe"></i>
                                                    Global Document (available to all characters)
                                                </span>
                                            </label>
                                        </div>
                                    )}

                                    <div className="document-form-actions">
                                        <button
                                            className="btn-save"
                                            onClick={() => isEditing ? handleUpdate(isEditing) : handleCreate()}
                                        >
                                            {isEditing ? 'Update' : 'Create'}
                                        </button>
                                        <button
                                            className="btn-cancel"
                                            onClick={cancelEdit}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {documents.length === 0 && !isCreating ? (
                                <div className="document-empty-state">
                                    <p>No documents yet</p>
                                    <p className="document-empty-hint">
                                        Add character notes, backgrounds, or templates to help the AI understand your character better.
                                    </p>
                                </div>
                            ) : (
                                <div className="document-list">
                                    {groupDocuments(documents).map((item) => {
                                        if (item.isGroup) {
                                            // Grouped chunked document
                                            const isExpanded = expandedGroups.has(item.id);
                                            const firstChunk = item.chunks[0];

                                            return (
                                                <div key={item.id} className="document-group">
                                                    <div className="document-item">
                                                        <div className="document-item-header">
                                                            <div
                                                                className="document-item-title"
                                                                onClick={() => toggleGroup(item.id)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <i className={`fa fa-${isExpanded ? 'chevron-down' : 'chevron-right'}`}></i>
                                                                <i className={`fa ${item.filename ? 'fa-file' : 'fa-file-text-o'}`}></i>
                                                                {item.title}
                                                                <span className="document-badge chunked" title={`${item.totalChunks} chunks`}>
                                                                    {item.totalChunks} parts
                                                                </span>
                                                                {item.is_global && (
                                                                    <span className="document-badge global" title="Global document">
                                                                        <i className="fa fa-globe"></i>
                                                                    </span>
                                                                )}
                                                                {item.filename && (
                                                                    <span className="document-badge file" title={`Uploaded file: ${item.filename}`}>
                                                                        <i className="fa fa-upload"></i>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="document-item-actions">
                                                                <button
                                                                    className="document-action-btn delete"
                                                                    onClick={() => handleDeleteGroup(item.chunks)}
                                                                    title="Delete all chunks"
                                                                >
                                                                    <i className="fa fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="document-item-content">
                                                            {firstChunk.content.substring(0, 150)}
                                                            {firstChunk.content.length > 150 && '...'}
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="document-chunks">
                                                            {item.chunks.map((chunk, idx) => (
                                                                <div key={chunk.id} className="document-chunk-item">
                                                                    <div className="document-chunk-header">
                                                                        <span className="document-chunk-label">
                                                                            Part {idx + 1}/{item.totalChunks}
                                                                        </span>
                                                                        <button
                                                                            className="document-action-btn"
                                                                            onClick={() => startEdit(chunk)}
                                                                            title="Edit chunk"
                                                                        >
                                                                            <i className="fa fa-edit"></i>
                                                                        </button>
                                                                    </div>
                                                                    <div className="document-chunk-content">
                                                                        {chunk.content.substring(0, 100)}
                                                                        {chunk.content.length > 100 && '...'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            // Regular document
                                            return (
                                                <div key={item.id} className="document-item">
                                                    <div className="document-item-header">
                                                        <div className="document-item-title">
                                                            <i className={`fa ${item.filename ? 'fa-file' : 'fa-file-text-o'}`}></i>
                                                            {item.title}
                                                            {item.is_global && (
                                                                <span className="document-badge global" title="Global document">
                                                                    <i className="fa fa-globe"></i>
                                                                </span>
                                                            )}
                                                            {item.filename && (
                                                                <span className="document-badge file" title={`Uploaded file: ${item.filename}`}>
                                                                    <i className="fa fa-upload"></i>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="document-item-actions">
                                                            <button
                                                                className="document-action-btn"
                                                                onClick={() => startEdit(item)}
                                                                title="Edit document"
                                                            >
                                                                <i className="fa fa-edit"></i>
                                                            </button>
                                                            <button
                                                                className="document-action-btn delete"
                                                                onClick={() => handleDelete(item.id)}
                                                                title="Delete document"
                                                            >
                                                                <i className="fa fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="document-item-content">
                                                        {item.content.substring(0, 150)}
                                                        {item.content.length > 150 && '...'}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
