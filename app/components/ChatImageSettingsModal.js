'use client';

import { useEffect, useState } from 'react';

export default function ChatImageSettingsModal({ show, onClose }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        model: '',
        style: '',
        positive_prefix: '',
        negative_prefix: '',
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        async function load() {
            if (!show) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/settings/user');
                if (!res.ok) throw new Error('Failed to load user settings');
                const settings = await res.json();
                const chat = settings?.chat_img_settings || {};
                setForm({
                    model: chat.model || '',
                    style: chat.style || '',
                    positive_prefix: chat.positive_prefix || '',
                    negative_prefix: chat.negative_prefix || '',
                });
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/settings/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_img_settings: { ...form } }),
            });
            if (!res.ok) throw new Error('Failed to save settings');
            onClose?.();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div className="app-settings-modal desktop-only">
            <div className="modal-backdrop" onClick={onClose}></div>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Chat Image Settings</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close">
                        <i className="fa fa-times"></i>
                    </button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <>
                            {error && (
                                <div className="error" style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>
                            )}
                            <div className="setting-item">
                                <div className="setting-label">
                                    <i className="fa fa-cube"></i>
                                    <span>Generation Model</span>
                                </div>
                                <input
                                    type="text"
                                    name="model"
                                    value={form.model}
                                    onChange={handleChange}
                                    placeholder="e.g. realisticVisionV60"
                                />
                            </div>

                            <div className="setting-item">
                                <div className="setting-label">
                                    <i className="fa fa-paint-brush"></i>
                                    <span>Style</span>
                                </div>
                                <input
                                    type="text"
                                    name="style"
                                    value={form.style}
                                    onChange={handleChange}
                                    placeholder="e.g. ultra-detailed, cinematic lighting"
                                />
                            </div>

                            <div className="setting-item">
                                <div className="setting-label">
                                    <i className="fa fa-plus"></i>
                                    <span>Positive Prompt Prefix</span>
                                </div>
                                <textarea
                                    name="positive_prefix"
                                    value={form.positive_prefix}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Text that is prepended to every prompt"
                                />
                            </div>

                            <div className="setting-item">
                                <div className="setting-label">
                                    <i className="fa fa-minus"></i>
                                    <span>Negative Prompt Prefix</span>
                                </div>
                                <textarea
                                    name="negative_prefix"
                                    value={form.negative_prefix}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Text that is prepended to the negative prompt"
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
