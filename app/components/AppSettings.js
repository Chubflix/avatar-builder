'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import HelpModal from './HelpModal';
import MobileSlideout from './MobileSlideout';
import './AppSettings.css';

export default function AppSettings() {
    const { state, dispatch, actions } = useApp();
    const [showHelp, setShowHelp] = useState(false);

    const handleToggleNotifications = () => {
        dispatch({
            type: actions.SET_NOTIFICATIONS_ENABLED,
            payload: !state.notificationsEnabled
        });
    };

    const handleToggleImageInfo = () => {
        dispatch({
            type: actions.SET_SHOW_IMAGE_INFO,
            payload: !state.showImageInfo
        });
    };

    const handleToggleHideNsfw = () => {
        dispatch({
            type: actions.SET_HIDE_NSFW,
            payload: !state.hideNsfw
        });
    };

    const handleToggleTagAutocomplete = () => {
        dispatch({
            type: actions.SET_TAG_AUTOCOMPLETE_ENABLED,
            payload: !state.tagAutocompleteEnabled
        });
    };

    if (!state.showAppSettings) return null;

    const settingsContent = (
        <>
            <div className="setting-item">
                <div className="setting-label">
                    <i className="fa fa-bell-o"></i>
                    <span>Push Notifications</span>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={state.notificationsEnabled}
                        onChange={handleToggleNotifications}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>

            <div className="setting-item">
                <div className="setting-label">
                    <i className="fa fa-info-circle"></i>
                    <span>Show Image Info</span>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={state.showImageInfo}
                        onChange={handleToggleImageInfo}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>

            <div className="setting-item">
                <div className="setting-label">
                    <i className="fa fa-eye-slash"></i>
                    <span>Hide NSFW Images</span>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={state.hideNsfw}
                        onChange={handleToggleHideNsfw}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>

            <div className="setting-item">
                <div className="setting-label">
                    <i className="fa fa-tags"></i>
                    <span>Tag Autocomplete</span>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={state.tagAutocompleteEnabled}
                        onChange={handleToggleTagAutocomplete}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>

            <div className="settings-footer">
                <button className="help-link" onClick={() => setShowHelp(true)}>
                    <i className="fa fa-question-circle"></i>
                    HELP
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Modal */}
            <div className="app-settings-modal desktop-only">
                <div className="modal-backdrop" onClick={() => dispatch({ type: actions.SET_SHOW_APP_SETTINGS, payload: false })}></div>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Settings</h2>
                        <button className="btn-close" onClick={() => dispatch({ type: actions.SET_SHOW_APP_SETTINGS, payload: false })}>
                            <i className="fa fa-times"></i>
                        </button>
                    </div>
                    <div className="modal-body">
                        {settingsContent}
                    </div>
                </div>
            </div>

            {/* Mobile Slide-out */}
            <MobileSlideout
                show={state.showAppSettings}
                onClose={() => dispatch({ type: actions.SET_SHOW_APP_SETTINGS, payload: false })}
                title="Settings"
            >
                {settingsContent}
            </MobileSlideout>

            <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />
        </>
    );
}
