'use client';

import React from 'react';
import './ToggleSwitch.css';

/**
 * ToggleSwitch atom
 * A reusable, styled checkbox presented as a switch.
 *
 * Props:
 * - checked: boolean
 * - onChange: (event) => void
 * - disabled?: boolean
 * - title?: string (tooltip)
 * - ariaLabel?: string (accessibility label)
 * - name?: string
 * - id?: string
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  title,
  ariaLabel,
  name,
  id,
}) {
  return (
    <label className="toggle-switch" title={title} aria-label={ariaLabel}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        name={name}
        id={id}
      />
      <span className="toggle-slider"></span>
    </label>
  );
}

export default ToggleSwitch;
