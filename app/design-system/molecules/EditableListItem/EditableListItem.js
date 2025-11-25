import React from 'react';
import { IconButton } from '@/app/design-system/atoms/IconButton';
import './EditableListItem.css';

/**
 * EditableListItem - An inline editing row with input field and action buttons
 *
 * Used for creating new items or editing existing ones in place
 *
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Input change handler
 * @param {function} props.onSave - Save button click handler
 * @param {function} props.onCancel - Cancel button click handler
 * @param {string} props.placeholder - Input placeholder text
 * @param {boolean} props.disabled - Whether save button is disabled
 * @param {boolean} props.autoFocus - Whether to auto-focus the input
 * @param {string} props.className - Additional CSS classes
 */
export const EditableListItem = ({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Enter name...',
  disabled = false,
  autoFocus = true,
  className = '',
  ...props
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !disabled) {
      onSave?.();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  const classNames = ['ds-editable-list-item', className].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      <input
        type="text"
        className="ds-editable-list-item__input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <IconButton
        icon="fa-check"
        variant="primary"
        size="medium"
        onClick={onSave}
        disabled={disabled}
        title="Save"
        className="ds-editable-list-item__save"
      />
      <IconButton
        icon="fa-times"
        variant="secondary"
        size="medium"
        onClick={onCancel}
        title="Cancel"
        className="ds-editable-list-item__cancel"
      />
    </div>
  );
};

export default EditableListItem;
