'use client';

import React, { useState, useEffect } from 'react';
import './ChatSessionManager.css';

/**
 * ChatSessionManager Component
 * Manages multiple chat sessions per character
 */
export default function ChatSessionManager({ characterId, characterName, currentSessionId, onSessionChange }) {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [error, setError] = useState(null);

    // Form states
    const [sessionName, setSessionName] = useState('');
    const [sessionDescription, setSessionDescription] = useState('');

    // Load sessions when character changes
    useEffect(() => {
        if (characterId) {
            loadSessions();
        } else {
            setSessions([]);
        }
    }, [characterId]);

    const loadSessions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/chat-sessions?character_id=${characterId}`);
            if (!response.ok) {
                throw new Error('Failed to load chat sessions');
            }
            const data = await response.json();
            setSessions(data);
        } catch (err) {
            console.error('Error loading chat sessions:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!sessionName.trim()) {
            alert('Please enter a session name');
            return;
        }

        try {
            setError(null);
            const response = await fetch('/api/chat-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: characterId,
                    name: sessionName.trim(),
                    description: sessionDescription.trim() || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create session');
            }

            const newSession = await response.json();
            await loadSessions();
            setIsCreating(false);
            setSessionName('');
            setSessionDescription('');

            // Auto-select the new session
            if (onSessionChange) {
                onSessionChange(newSession.id);
            }
        } catch (err) {
            console.error('Error creating session:', err);
            setError(err.message);
        }
    };

    const handleUpdate = async (sessionId) => {
        if (!sessionName.trim()) {
            alert('Please enter a session name');
            return;
        }

        try {
            setError(null);
            const response = await fetch(`/api/chat-sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: sessionName.trim(),
                    description: sessionDescription.trim() || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update session');
            }

            await loadSessions();
            setIsEditing(null);
            setSessionName('');
            setSessionDescription('');
        } catch (err) {
            console.error('Error updating session:', err);
            setError(err.message);
        }
    };

    const handleDelete = async (sessionId) => {
        if (!confirm('Are you sure you want to delete this chat session? All messages will be lost.')) {
            return;
        }

        try {
            setError(null);
            const response = await fetch(`/api/chat-sessions/${sessionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete session');
            }

            // If deleting current session, switch to null (default chat)
            if (currentSessionId === sessionId && onSessionChange) {
                onSessionChange(null);
            }

            await loadSessions();
        } catch (err) {
            console.error('Error deleting session:', err);
            setError(err.message);
        }
    };

    const startEdit = (session) => {
        setIsEditing(session.id);
        setSessionName(session.name);
        setSessionDescription(session.description || '');
        setIsCreating(false);
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setIsCreating(false);
        setSessionName('');
        setSessionDescription('');
        setError(null);
    };

    const selectSession = (sessionId) => {
        if (onSessionChange) {
            onSessionChange(sessionId);
        }
    };

    if (!characterId) {
        return null;
    }

    return (
        <div className="session-manager">
            <div className="session-manager-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="session-manager-header-content">
                    <i className={`fa fa-${isExpanded ? 'chevron-down' : 'chevron-right'}`}></i>
                    <i className="fa fa-comments"></i>
                    <span>Chat Sessions ({sessions.length})</span>
                </div>
                {!isExpanded && (
                    <span className="session-manager-hint">
                        {currentSessionId
                            ? sessions.find(s => s.id === currentSessionId)?.name || 'Session'
                            : 'Default chat'}
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className="session-manager-content">
                    {error && (
                        <div className="session-manager-error">
                            <i className="fa fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="session-manager-loading">
                            <div className="spinner"></div>
                            <p>Loading sessions...</p>
                        </div>
                    ) : (
                        <>
                            {!isCreating && !isEditing && (
                                <button
                                    className="session-add-btn"
                                    onClick={() => {
                                        // Trigger new session with special ID
                                        if (onSessionChange) {
                                            onSessionChange('__NEW_SESSION__');
                                        }
                                    }}
                                >
                                    <i className="fa fa-plus"></i>
                                    New Chat Session
                                </button>
                            )}

                            {(isCreating || isEditing) && (
                                <div className="session-form">
                                    <input
                                        type="text"
                                        className="session-form-input"
                                        placeholder="Session name (e.g., 'Greeting conversation')"
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="session-form-input"
                                        placeholder="Description (optional)"
                                        value={sessionDescription}
                                        onChange={(e) => setSessionDescription(e.target.value)}
                                    />
                                    <div className="session-form-actions">
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

                            {/* Default chat option */}
                            <div
                                className={`session-item ${!currentSessionId ? 'active' : ''}`}
                                onClick={() => selectSession(null)}
                            >
                                <div className="session-item-header">
                                    <div className="session-item-title">
                                        <i className="fa fa-comment-o"></i>
                                        <span>Default Chat</span>
                                        {!currentSessionId && (
                                            <span className="session-badge active">Active</span>
                                        )}
                                    </div>
                                </div>
                                <div className="session-item-description">
                                    General character conversation
                                </div>
                            </div>

                            {/* Session list */}
                            {sessions.length > 0 && (
                                <div className="session-list">
                                    {sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                                            onClick={() => selectSession(session.id)}
                                        >
                                            <div className="session-item-header">
                                                <div className="session-item-title">
                                                    <i className="fa fa-comments-o"></i>
                                                    <span>{session.name}</span>
                                                    {currentSessionId === session.id && (
                                                        <span className="session-badge active">Active</span>
                                                    )}
                                                </div>
                                                <div className="session-item-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className="session-action-btn"
                                                        onClick={() => startEdit(session)}
                                                        title="Edit session"
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                    <button
                                                        className="session-action-btn delete"
                                                        onClick={() => handleDelete(session.id)}
                                                        title="Delete session"
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            {session.description && (
                                                <div className="session-item-description">
                                                    {session.description}
                                                </div>
                                            )}
                                            <div className="session-item-meta">
                                                Last activity: {new Date(session.last_message_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
