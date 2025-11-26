'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useSettings } from '../hooks';
import { ModalHeader } from '@/app/design-system/molecules/ModalHeader';
import { IconButton } from '@/app/design-system/atoms/IconButton';
import { ToggleSwitch } from '@/app/design-system/atoms/ToggleSwitch';
import sdAPI from '@/app/utils/sd-api';
import { notifyJobQueued } from '@/app/utils/queue-notifications';
import './ConfigModal.css';

function ConfigModal({ show, onClose }) {
    const [mounted, setMounted] = useState(false);
    const { state, dispatch, actions } = useApp();
    const { loadUserSettings, updateUserSettings, loadGlobalSettings, updateGlobalSettings, checkIsAdmin } = useSettings();

    const [activeTab, setActiveTab] = useState('defaults');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState(null);

    // Downloads state
    const [dlType, setDlType] = useState('lora'); // 'lora' | 'model'
    const [dlUrl, setDlUrl] = useState('');
    const [dlError, setDlError] = useState(null);
    const [downloading, setDownloading] = useState(false);

    // Form state
    const [userSettings, setUserSettings] = useState({
        default_positive_prompt: '',
        default_negative_prompt: '',
        default_dimension: 'portrait',
        default_batch_size: 1,
        generation_settings: {
            samplerName: 'DPM++ 2M',
            scheduler: 'Karras',
            steps: 25,
            cfgScale: 7
        },
        // Support multiple ADetailer items (array of { enabled, model })
        adetailer_settings: []
    });

    const [globalSettings, setGlobalSettings] = useState({
        loras: [],
        dimensions: {
            portrait: { width: 832, height: 1216 },
            landscape: { width: 1216, height: 832 },
            square: { width: 1024, height: 1024 }
        }
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Load settings when modal opens
    useEffect(() => {
        if (show) {
            loadSettings();
            checkAdminStatus();
        }
    }, [show]);

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load user settings
            const userData = await loadUserSettings();
            if (userData) {
                // Normalize ADetailer: accept object or array from DB
                const rawAD = userData.adetailer_settings;
                const adetailerList = Array.isArray(rawAD)
                    ? rawAD
                    : (rawAD && typeof rawAD === 'object')
                        ? [rawAD]
                        : [];

                setUserSettings(prev => ({
                    ...prev,
                    ...userData,
                    adetailer_settings: adetailerList
                }));
            }

            // Load global settings
            const lorasData = await loadGlobalSettings('loras');
            const dimensionsData = await loadGlobalSettings('dimensions');

            if (lorasData?.value) {
                setGlobalSettings(prev => ({ ...prev, loras: lorasData.value }));
            }
            if (dimensionsData?.value) {
                setGlobalSettings(prev => ({ ...prev, dimensions: dimensionsData.value }));
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const checkAdminStatus = async () => {
        try {
            const adminStatus = await checkIsAdmin();
            setIsAdmin(adminStatus);
        } catch (err) {
            console.error('Failed to check admin status:', err);
            setIsAdmin(false);
        }
    };

    const handleSaveUserSettings = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateUserSettings(userSettings);
            onClose();
        } catch (err) {
            console.error('Failed to save user settings:', err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveGlobalSettings = async () => {
        if (!isAdmin) {
            setError('Admin access required to modify global settings');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await updateGlobalSettings('loras', globalSettings.loras, 'Available LoRA models and configurations');
            await updateGlobalSettings('dimensions', globalSettings.dimensions, 'Available dimension presets');
            onClose();
        } catch (err) {
            console.error('Failed to save global settings:', err);
            setError(err.message || 'Failed to save global settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (activeTab === 'global') {
            handleSaveGlobalSettings();
        } else {
            handleSaveUserSettings();
        }
    };

    if (!show || !mounted) return null;

    const tabs = [
        { id: 'defaults', label: 'Defaults', icon: 'fa-sliders' },
        { id: 'generation', label: 'Generation', icon: 'fa-cog' },
        { id: 'adetailer', label: 'ADetailer', icon: 'fa-magic' },
        { id: 'downloads', label: 'Downloads', icon: 'fa-download' },
        { id: 'global', label: 'Global Settings', icon: 'fa-globe', adminOnly: true }
    ];

    const modalContent = (
        <div className="modal-overlay config-modal-overlay" onClick={onClose}>
            <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
                <ModalHeader title="Configuration" onClose={onClose} />

                <div className="config-modal-tabs">
                    {tabs.map(tab => {
                        if (tab.adminOnly && !isAdmin) return null;
                        return (
                            <button
                                key={tab.id}
                                className={`config-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={`fa ${tab.icon}`}></i>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="config-modal-body">
                    {loading && (
                        <div className="config-loading">
                            <i className="fa fa-spinner fa-spin"></i>
                            <span>Loading settings...</span>
                        </div>
                    )}

                    {error && (
                        <div className="config-error">
                            <i className="fa fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {!loading && (
                        <>
                            {activeTab === 'downloads' && (
                                <div className="config-section">
                                    <h5>Downloads</h5>
                                    <p className="config-description">
                                        Download assets from Civitai into your Stable Diffusion instance via the proxy.
                                    </p>

                                    {dlError && (
                                        <div className="config-error" style={{ marginBottom: 12 }}>
                                            <i className="fa fa-exclamation-circle"></i>
                                            <span>{dlError}</span>
                                        </div>
                                    )}

                                    <div className="form-group" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ minWidth: 160 }}>
                                            <label className="form-label">Type</label>
                                            <select
                                                className="form-input"
                                                value={dlType}
                                                onChange={(e) => setDlType(e.target.value)}
                                            >
                                                <option value="lora">Lora</option>
                                                <option value="model">Model</option>
                                            </select>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 260 }}>
                                            <label className="form-label">Civitai URL or AIR URN</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="https://civitai.com/models/... or urn:air:sdxl:lora:civitai:123@456"
                                                value={dlUrl}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDlUrl(val);
                                                    // Detect AIR URN and auto-set type
                                                    const m = /^urn:air:[^:]+:(lora|checkpoint):civitai:\d+(?:@\d+)?$/i.exec((val || '').trim());
                                                    if (m) {
                                                        const kind = m[1].toLowerCase();
                                                        setDlType(kind === 'checkpoint' ? 'model' : 'lora');
                                                        setDlError(null);
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div style={{ alignSelf: 'end' }}>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                disabled={downloading}
                                                onClick={async () => {
                                                    setDlError(null);
                                                    // Validate URL or AIR URN
                                                    const url = (dlUrl || '').trim();
                                                    const isHttp = /^https:\/\/civitai\.com\//i.test(url);
                                                    const isUrn = /^urn:air:[^:]+:(lora|checkpoint):civitai:\d+(?:@\d+)?$/i.test(url);
                                                    if (!isHttp && !isUrn) {
                                                        setDlError('Please enter a valid Civitai URL (https://civitai.com/...) or AIR URN (urn:air:...)');
                                                        return;
                                                    }
                                                    setDownloading(true);
                                                    try {
                                                        // Map AIR URN checkpoint -> model already via dlType
                                                        const resp = await sdAPI.submitJob('/sdapi/v1/assets/download', { kind: dlType, url }, false);
                                                        // If queued, broadcast
                                                        const jobId = resp?.jobId || resp?.raw?.jobId || resp?.raw?.id || null;
                                                        if (resp?.queued && jobId) {
                                                            notifyJobQueued(String(jobId));
                                                        }
                                                    } catch (e) {
                                                        console.error('Download failed', e);
                                                        setDlError(e?.message || 'Failed to start download');
                                                    } finally {
                                                        setDownloading(false);
                                                    }
                                                }}
                                            >
                                                {downloading ? (<><i className="fa fa-spinner fa-spin"></i> Downloading...</>) : (<><i className="fa fa-download"></i> Download</>)}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'defaults' && (
                                <div className="config-section">
                                    <h5>Default Settings</h5>
                                    <p className="config-description">Set your default values for new generations</p>

                                    <div className="form-group">
                                        <label className="form-label">Default Positive Prompt</label>
                                        <textarea
                                            className="form-input"
                                            value={userSettings.default_positive_prompt || ''}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                default_positive_prompt: e.target.value
                                            }))}
                                            rows={3}
                                            placeholder="e.g., masterpiece, best quality..."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Default Negative Prompt</label>
                                        <textarea
                                            className="form-input"
                                            value={userSettings.default_negative_prompt || ''}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                default_negative_prompt: e.target.value
                                            }))}
                                            rows={3}
                                            placeholder="e.g., lazyneg, lazyhand..."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Default Orientation</label>
                                        <select
                                            className="form-input"
                                            value={userSettings.default_dimension || 'portrait'}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                default_dimension: e.target.value
                                            }))}
                                        >
                                            <option value="portrait">Portrait</option>
                                            <option value="landscape">Landscape</option>
                                            <option value="square">Square</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Default Batch Size</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={userSettings.default_batch_size || 1}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                default_batch_size: parseInt(e.target.value) || 1
                                            }))}
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'generation' && (
                                <div className="config-section">
                                    <h5>Generation Settings</h5>
                                    <p className="config-description">Configure Stable Diffusion generation parameters</p>

                                    <div className="form-group">
                                        <label className="form-label">Sampler</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={userSettings.generation_settings?.samplerName || ''}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                generation_settings: {
                                                    ...prev.generation_settings,
                                                    samplerName: e.target.value
                                                }
                                            }))}
                                            placeholder="e.g., DPM++ 2M, Euler a"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Scheduler</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={userSettings.generation_settings?.scheduler || ''}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                generation_settings: {
                                                    ...prev.generation_settings,
                                                    scheduler: e.target.value
                                                }
                                            }))}
                                            placeholder="e.g., Karras, Automatic"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Steps</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={userSettings.generation_settings?.steps || 25}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                generation_settings: {
                                                    ...prev.generation_settings,
                                                    steps: parseInt(e.target.value) || 25
                                                }
                                            }))}
                                            min="1"
                                            max="150"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">CFG Scale</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={userSettings.generation_settings?.cfgScale || 7}
                                            onChange={(e) => setUserSettings(prev => ({
                                                ...prev,
                                                generation_settings: {
                                                    ...prev.generation_settings,
                                                    cfgScale: parseFloat(e.target.value) || 7
                                                }
                                            }))}
                                            min="1"
                                            max="30"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'adetailer' && (
                                <div className="config-section">
                                    <h5>ADetailer Settings</h5>
                                    <p className="config-description">Manage one or more ADetailer detectors</p>

                                    {(userSettings.adetailer_settings?.length === 0) && (
                                        <div className="config-info">
                                            <i className="fa fa-info-circle"></i>
                                            <span>No ADetailer items yet. Add one below.</span>
                                        </div>
                                    )}

                                    {(userSettings.adetailer_settings || []).map((item, idx) => (
                                        <div key={idx} className="form-group" style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 6, marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <ToggleSwitch
                                                        checked={!!item.enabled}
                                                        onChange={(e) => setUserSettings(prev => {
                                                            const list = [...(prev.adetailer_settings || [])];
                                                            list[idx] = { ...list[idx], enabled: e.target.checked };
                                                            return { ...prev, adetailer_settings: list };
                                                        })}
                                                        title="Enable detector"
                                                        ariaLabel="Enable detector"
                                                    />
                                                </div>

                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    style={{ flex: 1, minWidth: 220 }}
                                                    value={item.model || ''}
                                                    onChange={(e) => setUserSettings(prev => {
                                                        const list = [...(prev.adetailer_settings || [])];
                                                        list[idx] = { ...list[idx], model: e.target.value };
                                                        return { ...prev, adetailer_settings: list };
                                                    })}
                                                    placeholder="e.g., face_yolov8n.pt"
                                                />

                                                <IconButton
                                                    icon="fa-trash"
                                                    variant="danger"
                                                    title="Remove item"
                                                    onClick={() => setUserSettings(prev => {
                                                        const list = [...(prev.adetailer_settings || [])];
                                                        list.splice(idx, 1);
                                                        return { ...prev, adetailer_settings: list };
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="form-group">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setUserSettings(prev => ({
                                                ...prev,
                                                adetailer_settings: [
                                                    ...(prev.adetailer_settings || []),
                                                    { model: '', enabled: false }
                                                ]
                                            }))}
                                        >
                                            <i className="fa fa-plus"></i> Add ADetailer Item
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'global' && (
                                <div className="config-section">
                                    <h5>Global Settings</h5>
                                    <p className="config-description">
                                        {isAdmin ?
                                            'Manage system-wide LoRAs and dimension presets' :
                                            'Admin access required to modify global settings'
                                        }
                                    </p>

                                    {!isAdmin && (
                                        <div className="config-info">
                                            <i className="fa fa-info-circle"></i>
                                            <span>Contact an administrator to make changes to global settings.</span>
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">LoRAs (JSON)</label>
                                                <textarea
                                                    className="form-input code-input"
                                                    value={JSON.stringify(globalSettings.loras, null, 2)}
                                                    onChange={(e) => {
                                                        try {
                                                            const parsed = JSON.parse(e.target.value);
                                                            setGlobalSettings(prev => ({ ...prev, loras: parsed }));
                                                            setError(null);
                                                        } catch (err) {
                                                            // Keep the text but show error
                                                            setError('Invalid JSON format');
                                                        }
                                                    }}
                                                    rows={12}
                                                    placeholder='[{"name": "...", "prompt": "...", "type": "..."}]'
                                                />
                                                <small className="form-hint">Array of LoRA configurations with name, prompt, type, etc.</small>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Dimensions (JSON)</label>
                                                <textarea
                                                    className="form-input code-input"
                                                    value={JSON.stringify(globalSettings.dimensions, null, 2)}
                                                    onChange={(e) => {
                                                        try {
                                                            const parsed = JSON.parse(e.target.value);
                                                            setGlobalSettings(prev => ({ ...prev, dimensions: parsed }));
                                                            setError(null);
                                                        } catch (err) {
                                                            setError('Invalid JSON format');
                                                        }
                                                    }}
                                                    rows={8}
                                                    placeholder='{"portrait": {"width": 832, "height": 1216}}'
                                                />
                                                <small className="form-hint">Dimension presets (portrait, landscape, square)</small>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="config-modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        className="btn-generate"
                        onClick={handleSave}
                        disabled={loading || saving || (activeTab === 'global' && !isAdmin)}
                    >
                        {saving ? (
                            <>
                                <i className="fa fa-spinner fa-spin"></i>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="fa fa-save"></i>
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default ConfigModal;
