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

    // Assets state (for Downloads tab)
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetsError, setAssetsError] = useState(null);
    const [assetEdits, setAssetEdits] = useState({}); // id -> { min, max, example_prompt }
    const [assetSaving, setAssetSaving] = useState({}); // id -> boolean

    // Lightbox takeover state for showing LoRA images inside the global lightbox
    const [lightboxBackup, setLightboxBackup] = useState(null); // previous images array
    const [lightboxHijacked, setLightboxHijacked] = useState(false);

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

    // Fetch assets for downloads tab
    const loadAssets = async () => {
        setAssetsError(null);
        setAssetsLoading(true);
        try {
            const list = await sdAPI.getAssets();
            setAssets(Array.isArray(list) ? list : []);
            // Initialize edits with current values
            const edits = {};
            (Array.isArray(list) ? list : []).forEach(a => {
                if (!a || !a.id) return;
                edits[a.id] = {
                    min: a.min ?? '',
                    max: a.max ?? '',
                    example_prompt: a.example_prompt ?? ''
                };
            });
            setAssetEdits(edits);
        } catch (e) {
            console.error('Failed to load assets', e);
            setAssetsError(e?.message || 'Failed to load assets');
        } finally {
            setAssetsLoading(false);
        }
    };

    useEffect(() => {
        if (show && activeTab === 'downloads') {
            loadAssets();
        }
    }, [show, activeTab]);

    // TODO: remove and create new lightbox component instead
    // When the lightbox closes (index becomes null), restore previous images if we hijacked them
    useEffect(() => {
        if (!lightboxHijacked) return;
        if (state.lightboxIndex === null && lightboxBackup) {
            dispatch({ type: actions.SET_IMAGES, payload: lightboxBackup });
            setLightboxBackup(null);
            setLightboxHijacked(false);
        }
    }, [state.lightboxIndex, lightboxHijacked, lightboxBackup, dispatch, actions]);

    const openAssetLightbox = (asset) => {
        if (!asset) return;
        // Build list of image objects compatible with Lightbox expectations
        const urls = new Set();
        const images = [];
        const pushIfNew = (img) => {
            const url = img?.url || img;
            if (!url || urls.has(url)) return;
            urls.add(url);
            images.push({
                id: `${asset.id}:${images.length}`,
                url,
                is_nsfw: Boolean(img?.is_nsfw),
                width: img?.width || null,
                height: img?.height || null,
                // Minimal fields to satisfy Lightbox; other props are optional
                name: asset.name || 'LoRA Image',
            });
        };
        if (Array.isArray(asset.images)) {
            asset.images.forEach(pushIfNew);
        }
        if (asset.image_url) {
            pushIfNew({ url: asset.image_url, is_nsfw: false });
        }
        if (images.length === 0) return; // nothing to show

        // Backup current images and replace with our temporary gallery
        if (!lightboxHijacked) {
            setLightboxBackup(state.images);
            setLightboxHijacked(true);
        }
        dispatch({ type: actions.SET_IMAGES, payload: images });
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: 0 });
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
                                    {/* Assets List */}
                                    <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color, #333)', paddingTop: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                                            <h6 style={{ margin: 0 }}>Available LoRAs</h6>
                                            <div>
                                                <button type="button" className="btn btn-secondary" onClick={loadAssets} disabled={assetsLoading}>
                                                    {assetsLoading ? (<><i className="fa fa-spinner fa-spin"></i> Refreshing...</>) : (<><i className="fa fa-refresh"></i> Refresh</>)}
                                                </button>
                                            </div>
                                        </div>
                                        {assetsError && (
                                            <div className="config-error" style={{ marginBottom: 12 }}>
                                                <i className="fa fa-exclamation-circle"></i>
                                                <span>{assetsError}</span>
                                            </div>
                                        )}
                                        {!assetsLoading && (assets?.filter?.(a => a?.kind === 'lora') || []).length === 0 && (
                                            <div className="config-empty">No LoRAs available.</div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                                            {(assets || []).filter(a => a?.kind === 'lora').map((a) => {
                                                const id = a.id;
                                                const edit = assetEdits[id] || { min: a.min ?? '', max: a.max ?? '', example_prompt: a.example_prompt ?? '' };
                                                const imageUrl = a.image_url || (Array.isArray(a.images) && a.images[0]?.url) || '';
                                                const isNSFW = Array.isArray(a.images) ? a.images.some(img => !!img?.is_nsfw) : false;
                                                const saving = !!assetSaving[id];
                                                return (
                                                    <div key={id} style={{ border: '1px solid var(--border-color, #333)', borderRadius: 8, padding: 10, background: 'var(--panel-bg, #111)' }}>
                                                        <div
                                                            style={{ position: 'relative', marginBottom: 8, cursor: imageUrl ? 'pointer' : 'default' }}
                                                            role={imageUrl ? 'button' : undefined}
                                                            tabIndex={imageUrl ? 0 : -1}
                                                            title={imageUrl ? 'Open preview images' : undefined}
                                                            onClick={() => imageUrl && openAssetLightbox(a)}
                                                            onKeyDown={(e) => {
                                                                if (!imageUrl) return;
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    openAssetLightbox(a);
                                                                }
                                                            }}
                                                        >
                                                            {imageUrl ? (
                                                                <img src={imageUrl} alt={a.name || 'LoRA'} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6 }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: 140, background: '#222', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777' }}>
                                                                    <i className="fa fa-image"></i>
                                                                </div>
                                                            )}
                                                            {isNSFW && (
                                                                <span title="NSFW" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(220, 20, 60, 0.9)', color: '#fff', fontSize: 10, padding: '3px 6px', borderRadius: 4 }}>
                                                                    <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }}></i>NSFW
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <i className="fa fa-puzzle-piece"></i>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || 'Unnamed LoRA'}</span>
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 6 }}>
                                                            <label className="form-label" style={{ marginBottom: 4 }}>Min</label>
                                                            <input type="number" className="form-input" value={edit.min}
                                                                   onChange={(e) => setAssetEdits(prev => ({ ...prev, [id]: { ...edit, min: e.target.value === '' ? '' : Number(e.target.value) } }))} />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 6 }}>
                                                            <label className="form-label" style={{ marginBottom: 4 }}>Max</label>
                                                            <input type="number" className="form-input" value={edit.max}
                                                                   onChange={(e) => setAssetEdits(prev => ({ ...prev, [id]: { ...edit, max: e.target.value === '' ? '' : Number(e.target.value) } }))} />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 8 }}>
                                                            <label className="form-label" style={{ marginBottom: 4 }}>Example Prompt</label>
                                                            <textarea className="form-input" rows={3} value={edit.example_prompt}
                                                                      onChange={(e) => setAssetEdits(prev => ({ ...prev, [id]: { ...edit, example_prompt: e.target.value } }))}
                                                                      placeholder="e.g., <lora:your_lora:0.8>, style keywords..." />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                            <button type="button" className="btn btn-secondary" disabled={saving}
                                                                    onClick={() => setAssetEdits(prev => ({ ...prev, [id]: { min: a.min ?? '', max: a.max ?? '', example_prompt: a.example_prompt ?? '' } }))}>
                                                                Reset
                                                            </button>
                                                            <button type="button" className="btn btn-primary" disabled={saving}
                                                                    onClick={async () => {
                                                                        setAssetsError(null);
                                                                        setAssetSaving(prev => ({ ...prev, [id]: true }));
                                                                        try {
                                                                            const patch = {
                                                                                min: edit.min === '' ? null : edit.min,
                                                                                max: edit.max === '' ? null : edit.max,
                                                                                example_prompt: edit.example_prompt
                                                                            };
                                                                            const result = await sdAPI.updateAsset(id, patch);
                                                                            if (result && result.success === false) {
                                                                                throw new Error(result.error || 'Failed to update asset');
                                                                            }
                                                                            // Update local state with edits
                                                                            setAssets(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
                                                                        } catch (err) {
                                                                            console.error('Failed to save asset', err);
                                                                            setAssetsError(err?.message || 'Failed to save asset');
                                                                        } finally {
                                                                            setAssetSaving(prev => ({ ...prev, [id]: false }));
                                                                        }
                                                                    }}>
                                                                {saving ? (<><i className="fa fa-spinner fa-spin"></i> Saving...</>) : 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
