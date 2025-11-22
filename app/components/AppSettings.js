'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import HelpModal from './HelpModal';
import './AppSettings.css';

export default function AppSettings() {
    const { state, dispatch, actions } = useApp();
    const [isClosing, setIsClosing] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            dispatch({ type: actions.SET_SHOW_APP_SETTINGS, payload: false });
            setIsClosing(false);
        }, 300);
    };

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

    if (!state.showAppSettings) return null;

    return (
        <>
            {/* Desktop Modal */}
            <div className="app-settings-modal desktop-only">
                <div className="modal-backdrop" onClick={handleClose}></div>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Settings</h2>
                        <button className="btn-close" onClick={handleClose}>
                            <i className="fa fa-times"></i>
                        </button>
                    </div>
                    <div className="modal-body">
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

                        <div className="settings-footer">
                            <button className="help-link" onClick={() => setShowHelp(true)}>
                                <i className="fa fa-question-circle"></i>
                                HELP
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Slide-out */}
            <div className={`app-settings-slideout mobile-only ${isClosing ? 'closing' : ''}`}>
                <div className="slideout-header">
                    <h2>Settings</h2>
                    <button className="btn-close" onClick={handleClose}>
                        <i className="fa fa-times"></i>
                    </button>
                </div>
                <div className="slideout-body">
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

                    <div className="settings-footer">
                        <button className="help-link" onClick={() => setShowHelp(true)}>
                            <i className="fa fa-question-circle"></i>
                            HELP
                        </button>
                    </div>
                </div>
            </div>

            <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />
        </>
    );
}
