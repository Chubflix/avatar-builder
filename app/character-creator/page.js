'use client';

import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { QueueProvider } from '../context/QueueContext';
import Navbar from '../components/Navbar';
import AppSettings from '../components/AppSettings';
import PWAManager from '../components/PWAManager';
import CharacterList from '../components/CharacterList';
import ChatInterface from '../components/ChatInterface';
import './character-creator.css';

function CharacterCreatorContent() {
    const { state, dispatch, actions } = useApp();
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [selectedCharacterId, setSelectedCharacterId] = useState(null);
    const [selectedCharacterName, setSelectedCharacterName] = useState(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedCharacterAvatarUrl, setSelectedCharacterAvatarUrl] = useState(null);
    const [isRestoringFromUrl, setIsRestoringFromUrl] = useState(true);

    // Helper: update URL params without pushing history entries
    const updateUrlParams = (params = {}) => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const search = url.searchParams;
        // Manage characterId
        if (params.hasOwnProperty('characterId')) {
            const value = params.characterId;
            if (value) search.set('characterId', String(value));
            else search.delete('characterId');
        }
        // Manage sessionId
        if (params.hasOwnProperty('sessionId')) {
            const value = params.sessionId;
            if (value) search.set('sessionId', String(value));
            else search.delete('sessionId');
        }
        const newUrl = `${url.pathname}${search.toString() ? `?${search.toString()}` : ''}${url.hash}`;
        window.history.replaceState(null, '', newUrl);
    };

    useEffect(() => {
        async function initialize() {
            try {
                const response = await fetch('/api/config');
                const data = await response.json();
                dispatch({ type: actions.SET_CONFIG, payload: data });
                setIsLoadingConfig(false);
            } catch (err) {
                console.error('Failed to load config:', err);
                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'error', message: 'Failed to load config: ' + err.message }
                });
                setIsLoadingConfig(false);
            }
        }

        initialize();
    }, [dispatch, actions]);

    // On initial load: read URL parameters to restore character and session
    useEffect(() => {
        if (isLoadingConfig) return;
        if (typeof window === 'undefined') return;
        try {
            const url = new URL(window.location.href);
            const qp = url.searchParams;
            const charId = qp.get('characterId');
            const sessId = qp.get('sessionId');
            if (charId) {
                setSelectedCharacterId(charId);
                // Fetch character details for name/avatar
                fetch('/api/characters')
                    .then(res => res.json())
                    .then(data => {
                        const character = Array.isArray(data) ? data.find(c => c.id === charId) : null;
                        if (character) {
                            setSelectedCharacterName(character.name);
                            setSelectedCharacterAvatarUrl(character.avatar_url || null);
                        }
                    })
                    .catch(err => console.error('Error fetching character details:', err));
            }
            if (sessId) {
                setCurrentSessionId(sessId);
            }
        } catch (e) {
            // noop
        } finally {
            // Allow auto-select only after we've attempted to restore from URL
            setIsRestoringFromUrl(false);
        }
    }, [isLoadingConfig]);

    const handleSelectCharacter = (characterId) => {
        setSelectedCharacterId(characterId);
        setCurrentSessionId(null); // Reset session when changing characters
        // Update URL: set characterId and clear sessionId
        updateUrlParams({ characterId, sessionId: null });

        // Fetch character details to get the name
        fetch('/api/characters')
            .then(res => res.json())
            .then(data => {
                const character = data.find(c => c.id === characterId);
                if (character) {
                    setSelectedCharacterName(character.name);
                    setSelectedCharacterAvatarUrl(character.avatar_url || null);
                }
            })
            .catch(err => console.error('Error fetching character details:', err));
    };

    const handleCreateCharacter = (character) => {
        setSelectedCharacterName(character.name);
        setSelectedCharacterAvatarUrl(character.avatar_url || null);
    };

    const handleSessionChange = (sessionId) => {
        setCurrentSessionId(sessionId);
        // Reflect both character and session in URL (without pushing history)
        updateUrlParams({ characterId: selectedCharacterId, sessionId });
    };

    const handleToggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    if (isLoadingConfig) {
        return (
            <>
                <Navbar onSettingsClick={() => {}} />
                <div className="character-creator-layout">
                    <div className="character-creator-loading">
                        <div className="spinner"></div>
                        <p>Loading configuration...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <PWAManager />

            <Navbar
                onSettingsClick={() => dispatch({ type: actions.SET_SHOW_APP_SETTINGS, payload: true })}
            />

            <div className="character-creator-layout">
                <div className={`character-creator-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
                    <CharacterList
                        selectedCharacterId={selectedCharacterId}
                        onSelectCharacter={handleSelectCharacter}
                        onCreateCharacter={handleCreateCharacter}
                        suppressAutoSelect={isRestoringFromUrl}
                    />
                </div>
                <div className="character-creator-main">
                    <ChatInterface
                        characterId={selectedCharacterId}
                        characterName={selectedCharacterName}
                        characterAvatarUrl={selectedCharacterAvatarUrl}
                        sessionId={currentSessionId}
                        onToggleCharacters={handleToggleSidebar}
                        isCharactersOpen={isSidebarOpen}
                        onSessionChange={handleSessionChange}
                    />
                </div>
            </div>

            <AppSettings />
        </>
    );
}

export default function CharacterCreatorPage() {
    return (
        <AppProvider>
            <QueueProvider>
                <CharacterCreatorContent />
            </QueueProvider>
        </AppProvider>
    );
}
