'use client';

import React, { useState } from 'react';
import './SearchBar.css';

/**
 * SearchBar combines an input field with a search icon and optional clear button
 */
export const SearchBar = ({
  placeholder = 'Search...',
  value,
  onChange,
  onClear,
  className = '',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    if (onChange) {
      onChange(e);
    }
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className={`ds-search-bar ${className}`}>
      <i className="fa fa-search ds-search-bar__icon"></i>
      <input
        type="text"
        className="ds-search-bar__input"
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        {...props}
      />
      {currentValue && (
        <button
          type="button"
          className="ds-search-bar__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <i className="fa fa-times"></i>
        </button>
      )}
    </div>
  );
};
