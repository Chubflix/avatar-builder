import React from 'react';
import './EmptyState.css';

/**
 * EmptyState - A centered empty state message with icon
 *
 * Used for displaying empty search results, empty folders, etc.
 *
 * @param {Object} props
 * @param {string} props.icon - FontAwesome icon class (e.g., "fa-search", "fa-folder-o")
 * @param {string} props.message - Empty state message text
 * @param {string} props.className - Additional CSS classes
 */
export const EmptyState = ({ icon, message, className = '' }) => {
  const classNames = ['ds-empty-state', className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {icon && <i className={`fa ${icon} ds-empty-state__icon`}></i>}
      <p className="ds-empty-state__message">{message}</p>
    </div>
  );
};

export default EmptyState;
