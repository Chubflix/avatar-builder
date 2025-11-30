'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatInterface.css';
import ChatImagesLightboxContainer from './ChatImagesLightboxContainer';
import DocumentManager from './DocumentManager';
import ChatSessionManager from './ChatSessionManager';
import { getAblyRealtime } from '@/app/lib/ably';

/**
 * ChatInterface Component
 * ChatGPT-like interface for character sheet design assistance
 */
export default function ChatInterface({ characterId, characterName, characterAvatarUrl = null, sessionId = null, onToggleCharacters, isCharactersOpen = true, onSessionChange }) {
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
    const [showMessageImageLightbox, setShowMessageImageLightbox] = useState(false);
    const [messageImages, setMessageImages] = useState([]);
    const [messageImageIndex, setMessageImageIndex] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Modals and UI state
    const [showDocsModal, setShowDocsModal] = useState(false);
    const [showSessionsModal, setShowSessionsModal] = useState(false);
    const [currentSessionName, setCurrentSessionName] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState(null);

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

    // Load current user gravatar (for user message icon)
    useEffect(() => {
        let isMounted = true;
        async function fetchMe() {
            try {
                const resp = await fetch('/api/me');
                if (!resp.ok) return;
                const data = await resp.json();
                if (isMounted && data?.gravatar) {
                    setUserAvatarUrl(data.gravatar);
                }
            } catch (_) {
                // ignore
            }
        }
        fetchMe();
        return () => { isMounted = false; };
    }, []);

    // Realtime subscription: listen for chat message updates (images attached, etc.)
    useEffect(() => {
        const realtime = getAblyRealtime?.();
        if (!realtime) return;
        const channel = realtime.channels.get('chat-messages');
        const onMessageUpdated = (evt) => {
            try {
                const data = evt?.data || {};
                if (!data?.message_id) return;
                setMessages((prev) => {
                    const idx = prev.findIndex((m) => m.id === data.message_id);
                    if (idx === -1) return prev;
                    const prevMsg = prev[idx];
                    const existingMeta = (prevMsg.metadata && typeof prevMsg.metadata === 'object') ? prevMsg.metadata : {};
                    const prevImages = Array.isArray(existingMeta.images) ? existingMeta.images : [];
                    const incoming = Array.isArray(data.images) ? data.images : [];
                    const mergedById = new Map();
                    for (const it of [...prevImages, ...incoming]) {
                        if (it?.id) mergedById.set(it.id, it);
                    }
                    const mergedImages = Array.from(mergedById.values());
                    const newMeta = {
                        ...existingMeta,
                        images: mergedImages,
                        generation_complete: data.generation_complete ?? existingMeta.generation_complete ?? true,
                    };
                    const updated = [...prev];
                    updated[idx] = { ...prevMsg, metadata: newMeta };
                    return updated;
                });
            } catch (_) {}
        };
        channel.subscribe('message_updated', onMessageUpdated);
        return () => {
            try { channel.unsubscribe('message_updated', onMessageUpdated); } catch (_) {}
            try { realtime.channels.release('chat-messages'); } catch (_) {}
        };
    }, []);

    // Load current session name when sessionId changes
    useEffect(() => {
        async function fetchSessionName() {
            if (!characterId) { setCurrentSessionName(''); return; }

            // Handle pending new session
            if (sessionId === '__NEW_SESSION__') {
                setCurrentSessionName('New Session');
                setMessages([]); // Clear messages for new session
                return;
            }

            try {
                const resp = await fetch(`/api/chat-sessions?character_id=${characterId}`);
                if (!resp.ok) return;
                const data = await resp.json();
                if (sessionId) {
                    const s = Array.isArray(data) ? data.find(x => x.id === sessionId) : null;
                    setCurrentSessionName(s?.name || '');
                } else {
                    // if no session selected, show most recent or blank
                    setCurrentSessionName('');
                }
            } catch (_) {
                setCurrentSessionName('');
            }
        }
        fetchSessionName();
    }, [characterId, sessionId]);

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

            if (isYamlFile) {
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
                let messageToSend = userMessage.content;
                if (isImageFile) {
                    // Upload image to S3 chat/ and send its URL to avoid context bloat
                    const uploadFd = new FormData();
                    uploadFd.append('character_id', characterId);
                    uploadFd.append('file', currentFile);

                    const uploadRes = await fetch('/api/chat/upload-image', {
                        method: 'POST',
                        body: uploadFd,
                    });
                    if (!uploadRes.ok) {
                        const errData = await uploadRes.json().catch(() => ({}));
                        throw new Error(errData.error || 'Failed to upload image');
                    }
                    const { url } = await uploadRes.json();
                    if (!url) throw new Error('Upload returned no URL');
                    messageToSend = `${inputValue.trim() ? inputValue.trim() + '\n\n' : ''}Describe the visible appearance of this image:\n${url}`;
                }

                const requestBody = {
                    character_id: characterId,
                    message: messageToSend,
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

            // If session was auto-created, switch to it
            if (data.session_id && sessionId === '__NEW_SESSION__' && onSessionChange) {
                onSessionChange(data.session_id);
            }

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
        // When selecting, create a user-side message and let the chat agent use the tool
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
            const requestBody = {
                character_id: characterId,
                message: userMessage.content,
                include_history: true,
            };
            if (sessionId) requestBody.session_id = sessionId;
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
            console.error('Error sending selected image to chat:', err);
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

    // Copy a message's raw content (preserve markdown, avoid rendered HTML)
    const handleCopyMessage = async (message) => {
        try {
            const text = typeof message?.content === 'string' ? message.content : '';
            if (!text) return;
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch (e) {
            console.error('Failed to copy message:', e);
            setError('Failed to copy message');
        }
    };

    const handleOpenMessageImage = (images, index = 0) => {
        setMessageImages(images);
        setMessageImageIndex(index);
        setShowMessageImageLightbox(true);
    };

    const handleCloseMessageImageLightbox = () => {
        setShowMessageImageLightbox(false);
        setMessageImages([]);
        setMessageImageIndex(0);
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
                        <p>Working on: {characterName || 'Character'}{` - ${currentSessionName || 'Session'}`}</p>
                    </div>
                </div>
                <div className="chat-header-actions">
                    <button
                        className={`chat-toggle-characters-btn ${isCharactersOpen ? '' : 'off'}`}
                        onClick={() => onToggleCharacters && onToggleCharacters()}
                        title={isCharactersOpen ? 'Hide characters' : 'Show characters'}
                    >
                        <i className="fa fa-users"></i>
                    </button>
                    <button
                        className="chat-header-btn"
                        onClick={() => setShowSessionsModal(true)}
                        title="Manage Chat Sessions"
                    >
                        <i className="fa fa-comments"></i>
                    </button>
                    <button
                        className="chat-header-btn"
                        onClick={() => setShowDocsModal(true)}
                        title="Character Documents"
                    >
                        <i className="fa fa-file"></i>
                    </button>
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
                                <div className={`chat-message-icon ${
                                    (message.role === 'assistant' && characterAvatarUrl) ||
                                    (message.role === 'user' && userAvatarUrl)
                                        ? 'has-avatar'
                                        : ''
                                }`}>
                                    {message.role === 'user' ? (
                                        userAvatarUrl ? (
                                            <img src={userAvatarUrl} alt="Your avatar" />
                                        ) : (
                                            <i className="fa fa-user"></i>
                                        )
                                    ) : characterAvatarUrl ? (
                                        <img onClick={() => handleOpenMessageImage([{url: characterAvatarUrl}])} src={characterAvatarUrl} alt="Character avatar" />
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
                                            {message.metadata?.images && message.metadata.images.length > 0 && (
                                                <div className="chat-message-images">
                                                    {message.metadata.images.map((img, idx) => (
                                                        <div
                                                            key={img.id || idx}
                                                            className="chat-message-image-thumbnail"
                                                            onClick={() => handleOpenMessageImage(message.metadata.images, idx)}
                                                            title="Click to view full size"
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={`Generated image ${idx + 1}`}
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="chat-message-actions">
                                                <button
                                                    className="chat-message-action-btn"
                                                    onClick={() => handleCopyMessage(message)}
                                                    title="Copy message"
                                                    disabled={isLoading}
                                                >
                                                    <i className="fa fa-copy"></i>
                                                </button>
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
                                <div className={`chat-message-icon ${characterAvatarUrl ? 'has-avatar' : ''}`}>
                                    {characterAvatarUrl ? (
                                        <img src={characterAvatarUrl} alt="Character avatar" />
                                    ) : (
                                        <i className="fa fa-robot"></i>
                                    )}
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

            {/* Modals */}
            {showDocsModal && (
                <div className="chat-modal">
                    <div className="chat-modal-backdrop" onClick={() => setShowDocsModal(false)}></div>
                    <div className="chat-modal-content">
                        <div className="chat-modal-header">
                            <h3>Character Documents</h3>
                            <button className="btn-close" onClick={() => setShowDocsModal(false)}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        <div className="chat-modal-body">
                            <DocumentManager characterId={characterId} characterName={characterName} />
                        </div>
                    </div>
                </div>
            )}

            {showSessionsModal && (
                <div className="chat-modal">
                    <div className="chat-modal-backdrop" onClick={() => setShowSessionsModal(false)}></div>
                    <div className="chat-modal-content">
                        <div className="chat-modal-header">
                            <h3>Chat Sessions</h3>
                            <button className="btn-close" onClick={() => setShowSessionsModal(false)}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        <div className="chat-modal-body">
                            <ChatSessionManager
                                characterId={characterId}
                                characterName={characterName}
                                currentSessionId={sessionId}
                                onSessionChange={(sid) => {
                                    onSessionChange && onSessionChange(sid);
                                    setShowSessionsModal(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

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
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
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
                    </div>
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

            {/* Footer removed to save vertical space */}

            {showImagePicker && !isPickerLoading && !pickerError && (
                <ChatImagesLightboxContainer
                    show={showImagePicker}
                    images={pickerImages}
                    initialIndex={0}
                    onClose={closeImagePicker}
                    onAttach={handleSelectImageFromPicker}
                />
            )}

            {showMessageImageLightbox && (
                <ChatImagesLightboxContainer
                    show={showMessageImageLightbox}
                    images={messageImages}
                    initialIndex={messageImageIndex}
                    onClose={handleCloseMessageImageLightbox}
                    onAttach={null}
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
