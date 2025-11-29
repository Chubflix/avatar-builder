import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useQueueContext } from '../context/QueueContext';
import GenerateButton from "./GenerateButton";
import BasicSettingsTab from './tabs/BasicSettingsTab';
import Img2ImgSettingsTab from './tabs/Img2ImgSettingsTab';
import LoraSettingsTab from './tabs/LoraSettingsTab';
import AdvancedSettingsTab from './tabs/AdvancedSettingsTab';

function ControlsPanel({ onGenerate, onResetDefaults }) {
    const { state, dispatch, actions } = useApp();
    const [activeTab, setActiveTab] = useState('basic');

    const {
        config,
        status
    } = state;
    const { count: queueCount } = useQueueContext();

    if (!config) return null;

    const tabs = [
        { id: 'basic', label: 'Basic', icon: 'fa-sliders' },
        { id: 'img2img', label: 'Img2Img', icon: 'fa-image' },
        { id: 'lora', label: 'Lora', icon: 'fa-magic' },
        { id: 'advanced', label: 'Advanced', icon: 'fa-cogs' }
    ];

    return (
        <div className="controls-panel desktop-only">
            {/* Header with buttons */}
            <div className="controls-header">
                {/* Generate Button */}
                <div>
                    <GenerateButton onGenerate={onGenerate} />
                </div>

                <div className="header-buttons">
                    <button
                        className="icon-button queue-button"
                        onClick={() => dispatch({ type: actions.SET_SHOW_QUEUE_MANAGER, payload: true })}
                        title="Queue Manager"
                    >
                        <i className="fa fa-code-fork"></i>
                        {queueCount > 0 && (
                            <span className="notification-badge">{queueCount}</span>
                        )}
                    </button>
                    <button
                        className="icon-button config-button"
                        onClick={() => dispatch({ type: actions.SET_SHOW_CONFIG_MODAL, payload: true })}
                        title="Configuration"
                    >
                        <i className="fa fa-cog"></i>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <i className={`fa ${tab.icon}`}></i>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-container">
                {activeTab === 'basic' && <BasicSettingsTab />}
                {activeTab === 'img2img' && <Img2ImgSettingsTab />}
                {activeTab === 'lora' && <LoraSettingsTab />}
                {activeTab === 'advanced' && <AdvancedSettingsTab onResetDefaults={onResetDefaults} />}
            </div>

            {/* Status Message */}
            {status && (
                <div className={`status-message ${status.type}`}>
                    <i className={`fa ${
                        status.type === 'success' ? 'fa-check-circle' :
                            status.type === 'error' ? 'fa-exclamation-circle' :
                                'fa-info-circle'
                    }`}></i>
                    {status.message}
                </div>
            )}
        </div>
    );
}

export default ControlsPanel;