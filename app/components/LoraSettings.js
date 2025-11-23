'use client';

import { useApp } from '../context/AppContext';
import './LoraSettings.css';

export default function LoraSettings() {
    const { state, dispatch, actions } = useApp();

    if (!state.config?.loras) return null;

    // Separate loras by type
    const sliders = state.config.loras.filter(lora => lora.type === 'slider');
    const toggles = state.config.loras.filter(lora => lora.type === 'toggle');
    const styles = state.config.loras.filter(lora => lora.type === 'style');

    // Sort styles alphabetically
    const sortedStyles = [...styles].sort((a, b) => a.name.localeCompare(b.name));

    const handleSliderChange = (name, value) => {
        dispatch({
            type: actions.SET_LORA_SLIDER,
            payload: { name, value: parseFloat(value) }
        });
    };

    const handleSliderToggle = (name, defaultValue) => {
        dispatch({
            type: actions.TOGGLE_LORA_SLIDER,
            payload: { name, defaultValue }
        });
    };

    const handleToggleChange = (name, enabled) => {
        dispatch({
            type: actions.SET_LORA_TOGGLE,
            payload: { name, enabled }
        });
    };

    const handleStyleChange = (e) => {
        dispatch({
            type: actions.SET_LORA_STYLE,
            payload: e.target.value
        });
    };

    return (
        <div className="lora-settings">
            <h3 className="lora-settings-title desktop-only">Lora Settings</h3>

            {/* Style Dropdown */}
            {sortedStyles.length > 0 && (
                <div className="lora-group">
                    <label className="lora-label">
                        <span>Style</span>
                        {sortedStyles[0]?.url && (
                            <a
                                href={sortedStyles[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lora-doc-link"
                                title="View documentation"
                            >
                                <i className="fa fa-question-circle"></i>
                            </a>
                        )}
                    </label>
                    <select
                        className="lora-select"
                        value={state.loraStyle}
                        onChange={handleStyleChange}
                    >
                        <option value="">None</option>
                        {sortedStyles.map(style => (
                            <option key={style.name} value={style.name}>
                                {style.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Sliders */}
            {sliders.map(slider => {
                const sliderState = state.loraSliders[slider.name] || {
                    enabled: false,
                    value: slider.defaultValue
                };

                return (
                    <div key={slider.name} className="lora-group">
                        <div className="lora-slider-header">
                            <label className="lora-label">
                                <label className="lora-switch">
                                    <input
                                        type="checkbox"
                                        checked={sliderState.enabled}
                                        onChange={() => handleSliderToggle(slider.name, slider.defaultValue)}
                                    />
                                    <span className="lora-switch-slider"></span>
                                </label>
                                <span>{slider.name}</span>
                                {slider.url && (
                                    <a
                                        href={slider.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="lora-doc-link"
                                        title="View documentation"
                                    >
                                        <i className="fa fa-question-circle"></i>
                                    </a>
                                )}
                            </label>
                            <span className="lora-slider-value">{sliderState.value.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            className="lora-slider"
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            value={sliderState.value}
                            onChange={(e) => handleSliderChange(slider.name, e.target.value)}
                            disabled={!sliderState.enabled}
                        />
                        <div className="lora-slider-labels">
                            <span className="lora-slider-label-min">{slider.minDesc}</span>
                            <span className="lora-slider-label-max">{slider.maxDesc}</span>
                        </div>
                    </div>
                );
            })}

            {/* Toggles */}
            {toggles.map(toggle => {
                const toggleState = state.loraToggles[toggle.name] || false;

                return (
                    <div key={toggle.name} className="lora-group">
                        <label className="lora-label lora-toggle-label">
                            <label className="lora-switch">
                                <input
                                    type="checkbox"
                                    checked={toggleState}
                                    onChange={(e) => handleToggleChange(toggle.name, e.target.checked)}
                                />
                                <span className="lora-switch-slider"></span>
                            </label>
                            <span>{toggle.name}</span>
                            {toggle.url && (
                                <a
                                    href={toggle.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lora-doc-link"
                                    title="View documentation"
                                >
                                    <i className="fa fa-question-circle"></i>
                                </a>
                            )}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}
