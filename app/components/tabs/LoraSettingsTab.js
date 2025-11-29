import React from 'react';
import { useApp } from '../../context/AppContext';
import LoraSettings from '../LoraSettings';
import '../LoraSettings.css';

function LoraSettingsTab() {
    const { state } = useApp();
    const { config } = state;

    if (!config || !config.loras || config.loras.length === 0) {
        return (
            <div className="tab-content">
                <p className="settings-hint">No Loras configured. Add Loras in config.json to use this feature.</p>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <LoraSettings />
        </div>
    );
}

export default LoraSettingsTab;
