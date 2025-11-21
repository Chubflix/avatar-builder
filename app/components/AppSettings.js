'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './AppSettings.css';

export default function AppSettings() {
    const { state, dispatch, actions } = useApp();
    const [isClosing, setIsClosing] = useState(false);

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
                </div>
            </div>
        </>
    );
}
