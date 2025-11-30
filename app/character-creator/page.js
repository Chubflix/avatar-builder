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

    const handleSelectCharacter = (characterId) => {
        setSelectedCharacterId(characterId);
        setCurrentSessionId(null); // Reset session when changing characters

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
