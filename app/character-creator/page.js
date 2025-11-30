'use client';

import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { QueueProvider } from '../context/QueueContext';
import Navbar from '../components/Navbar';
import AppSettings from '../components/AppSettings';
import PWAManager from '../components/PWAManager';

function CharacterCreatorContent() {
    const { state, dispatch, actions } = useApp();
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

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

    if (isLoadingConfig) {
        return (
            <>
                <Navbar onSettingsClick={() => {}} />
                <div className="main-container">
                    <div className="empty-state">
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '1rem' }}>Loading configuration...</p>
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

            <div className="main-container">
                <div className="app-container">
                    <div className="character-creator-container">
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            marginBottom: '2rem',
                            color: 'var(--text-primary)'
                        }}>
                            Character Creator
                        </h1>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.125rem',
                            marginBottom: '2rem'
                        }}>
                            Create and manage your characters here.
                        </p>
                        <div className="empty-state">
                            <p style={{ color: 'var(--text-muted)' }}>
                                Character creation tools coming soon...
                            </p>
                        </div>
                    </div>
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
