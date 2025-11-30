'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatInterface.css';
import ChatImagesLightboxContainer from './ChatImagesLightboxContainer';

/**
 * ChatInterface Component
 * ChatGPT-like interface for character sheet design assistance
 */
export default function ChatInterface({ characterId, characterName, sessionId = null }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingContent, setEditingContent] = useState('');
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [pickerImages, setPickerImages] = useState([]);
    const [isPickerLoading, setIsPickerLoading] = useState(false);
    const [pickerError, setPickerError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Load chat history when character or session changes
    useEffect(() => {
        if (characterId) {
            loadChatHistory();
        } else {
            setMessages([]);
        }
    }, [characterId, sessionId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChatHistory = async () => {
        try {
            setError(null);
            let url = `/api/chat?character_id=${characterId}`;
            if (sessionId) {
                url += `&session_id=${sessionId}`;
            }
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            const data = await response.json();
            setMessages(data);
        } catch (err) {
            console.error('Error loading chat history:', err);
            setError('Failed to load chat history');
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type (allow YAML and common image types)
            const validExtensions = ['.yaml', '.yml', '.png', '.jpg', '.jpeg', '.webp'];
            const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!validExtensions.includes(extension)) {
                setError('Please select a .yaml, .yml, or image file (png, jpg, jpeg, webp)');
                return;
            }
            setAttachedFile(file);
            setError(null);
        }
    };

    const handleRemoveFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const isImageExtension = (name) => {
        const ext = name?.substring(name.lastIndexOf('.')).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    };

    const looksLikeUrl = (text) => /^https?:\/\//i.test(text?.trim());

    const handleSendMessage = async () => {
        if ((!inputValue.trim() && !attachedFile) || !characterId || isLoading) {
            return;
        }

        const userMessageContent = attachedFile
            ? `${inputValue.trim()}\n\n[Attached: ${attachedFile.name}]`
            : inputValue.trim();

        const userMessage = {
            role: 'user',
            content: userMessageContent,
            created_at: new Date().toISOString(),
        };

        // Add user message to UI immediately
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        const currentFile = attachedFile;
        setAttachedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setIsLoading(true);
        setError(null);

        try {
            let response;

            const isImageFile = currentFile && isImageExtension(currentFile.name);
            const isYamlFile = currentFile && !isImageFile;
            const isImageUrl = !currentFile && looksLikeUrl(userMessage.content);

            if (isImageFile) {
                // Analyze image appearance (no DB updates)
                const formData = new FormData();
                formData.append('character_id', characterId);
                formData.append('file', currentFile);
                response = await fetch('/api/analyze-image', {
                    method: 'POST',
                    body: formData,
                });
            } else if (isImageUrl) {
                response = await fetch('/api/analyze-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ character_id: characterId, imageUrl: userMessage.content.trim() }),
                });
            } else if (isYamlFile) {
                // Existing YAML flow
                const formData = new FormData();
                formData.append('character_id', characterId);
                formData.append('message', inputValue.trim() || 'Updating character with attached sheet');
                formData.append('file', currentFile);
                formData.append('include_history', 'true');
                if (sessionId) {
                    formData.append('session_id', sessionId);
                }

                response = await fetch('/api/chat', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                // Standard chat JSON
                const requestBody = {
                    character_id: characterId,
                    message: userMessage.content,
                    include_history: true,
                };

                if (sessionId) {
                    requestBody.session_id = sessionId;
                }

                response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const data = await response.json();

            // Add assistant response to UI
            const assistantMessage = (data && (data.message || data.description))
                ? {
                    id: data.message_id || undefined,
                    role: 'assistant',
                    content: data.message || data.description,
                    metadata: data.metadata,
                    created_at: new Date().toISOString(),
                }
                : null;

            if (assistantMessage) {
                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message);

            // Remove the user message if request failed
            setMessages((prev) => prev.slice(0, -1));
            // Restore input value and file
            setInputValue(userMessage.content);
            setAttachedFile(currentFile);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Image picker helpers
    const openImagePicker = async () => {
        if (!characterId) return;
        try {
            setPickerError(null);
            setIsPickerLoading(true);
            setShowImagePicker(true);
            const res = await fetch(`/api/images?character_id=${characterId}&limit=100`);
            if (!res.ok) {
                throw new Error('Failed to load images');
            }
            const data = await res.json();
            setPickerImages(Array.isArray(data.images) ? data.images : []);
        } catch (e) {
            console.error('Error loading images for picker:', e);
            setPickerError(e.message || 'Failed to load images');
        } finally {
            setIsPickerLoading(false);
        }
    };

    const closeImagePicker = () => {
        setShowImagePicker(false);
        setPickerImages([]);
        setIsPickerLoading(false);
        setPickerError(null);
    };

    const handleSelectImageFromPicker = async (image) => {
        // When selecting, create a user-side message to show intent, then call analyze-image
        const url = image?.url;
        if (!url) return;
        const userMessage = {
            role: 'user',
            content: `Describe the visible appearance of this image:\n${url}`,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        closeImagePicker();
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_id: characterId, imageUrl: url }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze image');
            }
            const data = await response.json();
            const assistantMessage = (data && (data.message || data.description))
                ? {
                    id: data.message_id || undefined,
                    role: 'assistant',
                    content: data.message || data.description,
                    metadata: data.metadata,
                    created_at: new Date().toISOString(),
                }
                : null;
            if (assistantMessage) {
                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (err) {
            console.error('Error analyzing selected image:', err);
            setError(err.message);
            // Remove the user message if failed
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleDeleteMessage = async (messageId, messageIndex) => {
        if (!confirm('Delete this message and all following messages?')) {
            return;
        }

        try {
            setError(null);

            // Delete from database
            const response = await fetch(`/api/chat/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: characterId,
                    session_id: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete message');
            }

            // Remove message and all following messages from UI
            setMessages((prev) => prev.slice(0, messageIndex));
        } catch (err) {
            console.error('Error deleting message:', err);
            setError('Failed to delete message');
        }
    };

    const handleEditMessage = (messageId, currentContent) => {
        setEditingMessageId(messageId);
        setEditingContent(currentContent);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent('');
    };

    const handleSaveEdit = async (messageId, messageIndex) => {
        if (!editingContent.trim()) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Update the message in database
            const updateResponse = await fetch(`/api/chat/messages/${messageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: characterId,
                    session_id: sessionId,
                    content: editingContent.trim(),
                }),
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update message');
            }

            // Update message in UI and remove all following messages
            const updatedMessages = messages.slice(0, messageIndex + 1);
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: editingContent.trim(),
            };
            setMessages(updatedMessages);

            setEditingMessageId(null);
            setEditingContent('');

            // Get new AI response
            const requestBody = {
                character_id: characterId,
                message: editingContent.trim(),
                include_history: true,
            };

            if (sessionId) {
                requestBody.session_id = sessionId;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const data = await response.json();

            // Add assistant response to UI
            const assistantMessage = {
                id: data.message_id,
                role: 'assistant',
                content: data.message,
                metadata: data.metadata,
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Error editing message:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRerollMessage = async (messageId, messageIndex) => {
        try {
            setIsLoading(true);
            setError(null);

            // Delete the AI message and all following messages
            const response = await fetch(`/api/chat/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: characterId,
                    session_id: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete message');
            }

            // Remove message and all following messages from UI
            const previousMessages = messages.slice(0, messageIndex);
            setMessages(previousMessages);

            // Find the previous user message
            const previousUserMessage = [...previousMessages].reverse().find(m => m.role === 'user');
            if (!previousUserMessage) {
                throw new Error('No previous user message found');
            }

            // Get new AI response
            const requestBody = {
                character_id: characterId,
                message: previousUserMessage.content,
                include_history: true,
            };

            if (sessionId) {
                requestBody.session_id = sessionId;
            }

            const aiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!aiResponse.ok) {
                const errorData = await aiResponse.json();
                throw new Error(errorData.error || 'Failed to reroll message');
            }

            const data = await aiResponse.json();

            // Add new assistant response to UI
            const assistantMessage = {
                id: data.message_id,
                role: 'assistant',
                content: data.message,
                metadata: data.metadata,
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Error rerolling message:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (!characterId) return;

        const sessionType = sessionId ? 'session' : 'default chat';
        if (!confirm(`Are you sure you want to clear this ${sessionType} history?`)) {
            return;
        }

        try {
            let url = `/api/chat?character_id=${characterId}`;
            if (sessionId) {
                url += `&session_id=${sessionId}`;
            }

            const response = await fetch(url, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to clear chat');
            }

            setMessages([]);
            setError(null);
        } catch (err) {
            console.error('Error clearing chat:', err);
            setError('Failed to clear chat');
        }
    };

    if (!characterId) {
        return (
            <div className="chat-interface">
                <div className="chat-empty-state">
                    <div className="chat-empty-icon">
                        <i className="fa fa-comments"></i>
                    </div>
                    <h3>Character Creator Assistant</h3>
                    <p>Select or create a character to start designing character sheets with AI assistance.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-interface">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-info">
                    <i className="fa fa-robot"></i>
                    <div className="chat-header-text">
                        <h3>Character Sheet Assistant</h3>
                        <p>Working on: {characterName || 'Character'}</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        className="chat-clear-btn"
                        onClick={handleClearChat}
                        title="Clear chat history"
                    >
                        <i className="fa fa-trash"></i>
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-welcome">
                        <div className="chat-welcome-icon">
                            <i className="fa fa-lightbulb"></i>
                        </div>
                        <h4>Let's create a great character!</h4>
                        <p>I can help you with:</p>
                        <ul className="chat-welcome-features">
                            <li><i className="fa fa-check"></i> Character backstories and motivations</li>
                            <li><i className="fa fa-check"></i> Personality traits and quirks</li>
                            <li><i className="fa fa-check"></i> Physical descriptions</li>
                            <li><i className="fa fa-check"></i> Character relationships</li>
                            <li><i className="fa fa-check"></i> Character sheet templates</li>
                        </ul>
                        <p className="chat-welcome-prompt">
                            Try asking: "Help me create a character sheet for a fantasy hero" or "What should I include in my character's backstory?"
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <div
                                key={message.id || index}
                                className={`chat-message ${message.role}`}
                            >
                                <div className="chat-message-icon">
                                    {message.role === 'user' ? (
                                        <i className="fa fa-user"></i>
                                    ) : (
                                        <i className="fa fa-robot"></i>
                                    )}
                                </div>
                                <div className="chat-message-content">
                                    {editingMessageId === message.id ? (
                                        <div className="chat-message-edit">
                                            <textarea
                                                className="chat-edit-textarea"
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                rows={5}
                                                autoFocus
                                            />
                                            <div className="chat-edit-actions">
                                                <button
                                                    className="chat-edit-save-btn"
                                                    onClick={() => handleSaveEdit(message.id, index)}
                                                    disabled={!editingContent.trim() || isLoading}
                                                >
                                                    <i className="fa fa-check"></i> Save & Resubmit
                                                </button>
                                                <button
                                                    className="chat-edit-cancel-btn"
                                                    onClick={handleCancelEdit}
                                                    disabled={isLoading}
                                                >
                                                    <i className="fa fa-times"></i> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="chat-message-text">
                                                {message.role === 'assistant' ? (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            // Custom styling for markdown elements
                                                            code: ({node, inline, className, children, ...props}) => {
                                                                return inline ? (
                                                                    <code className="inline-code" {...props}>
                                                                        {children}
                                                                    </code>
                                                                ) : (
                                                                    <pre className="code-block">
                                                                        <code className={className} {...props}>
                                                                            {children}
                                                                        </code>
                                                                    </pre>
                                                                );
                                                            },
                                                            ul: ({node, ...props}) => <ul className="markdown-list" {...props} />,
                                                            ol: ({node, ...props}) => <ol className="markdown-list" {...props} />,
                                                            li: ({node, ...props}) => <li className="markdown-list-item" {...props} />,
                                                            h1: ({node, ...props}) => <h1 className="markdown-h1" {...props} />,
                                                            h2: ({node, ...props}) => <h2 className="markdown-h2" {...props} />,
                                                            h3: ({node, ...props}) => <h3 className="markdown-h3" {...props} />,
                                                            blockquote: ({node, ...props}) => <blockquote className="markdown-blockquote" {...props} />,
                                                            a: ({node, ...props}) => <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props} />,
                                                        }}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    message.content
                                                )}
                                            </div>
                                            <div className="chat-message-actions">
                                                {message.role === 'user' && (
                                                    <button
                                                        className="chat-message-action-btn"
                                                        onClick={() => handleEditMessage(message.id, message.content)}
                                                        title="Edit message"
                                                        disabled={isLoading}
                                                    >
                                                        <i className="fa fa-edit"></i>
                                                    </button>
                                                )}
                                                {message.role === 'assistant' && (
                                                    <button
                                                        className="chat-message-action-btn"
                                                        onClick={() => handleRerollMessage(message.id, index)}
                                                        title="Regenerate response"
                                                        disabled={isLoading}
                                                    >
                                                        <i className="fa fa-refresh"></i>
                                                    </button>
                                                )}
                                                <button
                                                    className="chat-message-action-btn chat-message-delete-btn"
                                                    onClick={() => handleDeleteMessage(message.id, index)}
                                                    title="Delete message and all following"
                                                    disabled={isLoading}
                                                >
                                                    <i className="fa fa-trash"></i>
                                                </button>
                                            </div>
                                            {message.metadata?.sources && message.metadata.sources.length > 0 && (
                                                <div className="chat-message-sources">
                                                    <div className="chat-message-sources-header">
                                                        <i className="fa fa-file-text"></i>
                                                        <span>Referenced documents:</span>
                                                    </div>
                                                    {message.metadata.sources.map((source, idx) => (
                                                        <div key={idx} className="chat-message-source">
                                                            <span className="chat-message-source-title">{source.title}</span>
                                                            <span className="chat-message-source-similarity">
                                                                {Math.round(source.similarity * 100)}% match
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {message.metadata?.usage && (
                                                <div className="chat-message-meta">
                                                    <span className="chat-message-tokens">
                                                        {message.metadata.usage.total_tokens} tokens
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message assistant">
                                <div className="chat-message-icon">
                                    <i className="fa fa-robot"></i>
                                </div>
                                <div className="chat-message-content">
                                    <div className="chat-typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
                <div className="chat-error">
                    <i className="fa fa-exclamation-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {/* Input */}
            <div className="chat-input-wrapper">
                {attachedFile && (
                    <div className="chat-attached-file">
                        <div className="chat-attached-file-info">
                            <i className="fa fa-file-text"></i>
                            <span>{attachedFile.name}</span>
                        </div>
                        <button
                            className="chat-remove-file-btn"
                            onClick={handleRemoveFile}
                            title="Remove file"
                        >
                            <i className="fa fa-times"></i>
                        </button>
                    </div>
                )}
                <div className="chat-input-container">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".yaml,.yml,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="chat-attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        title="Attach character sheet (.yaml/.yml) or image (.png/.jpg/.jpeg/.webp)"
                    >
                        <i className="fa fa-paperclip"></i>
                    </button>
                    <button
                        className="chat-attach-btn"
                        onClick={openImagePicker}
                        disabled={isLoading}
                        title="Pick from character images"
                    >
                        <i className="fa fa-image"></i>
                    </button>
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        placeholder="Ask me anything about character design..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSendMessage}
                        disabled={(!inputValue.trim() && !attachedFile) || isLoading}
                        title="Send message (Enter)"
                    >
                        <i className="fa fa-paper-plane"></i>
                    </button>
                </div>
            </div>

            <div className="chat-footer">
                <p>AI-powered character sheet assistant using Deepseek</p>
            </div>

            {showImagePicker && !isPickerLoading && !pickerError && (
                <ChatImagesLightboxContainer
                    show={showImagePicker}
                    images={pickerImages}
                    initialIndex={0}
                    onClose={closeImagePicker}
                    onAttach={handleSelectImageFromPicker}
                />
            )}

            {/* Keep lightweight state handling for error/loading during fetch */}
            {showImagePicker && (isPickerLoading || pickerError) && (
                <div className="chat-image-picker-overlay" onClick={(e) => {
                    if (e.target.classList.contains('chat-image-picker-overlay')) closeImagePicker();
                }}>
                    <div className="chat-image-picker-modal">
                        <div className="chat-image-picker-header">
                            <h4>Select an image</h4>
                            <button className="chat-remove-file-btn" onClick={closeImagePicker} title="Close">
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        {pickerError ? (
                            <div className="chat-error" style={{ margin: '8px 0' }}>
                                <i className="fa fa-exclamation-circle"></i>
                                <span>{pickerError}</span>
                            </div>
                        ) : (
                            <div className="chat-typing-indicator" style={{ padding: 16 }}>
                                <span></span><span></span><span></span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
