import React from 'react';
import './ListItem.css';

/**
 * ListItem - A clickable list item with icon, label, and optional count
 *
 * Used for displaying characters, folders, and special items in lists
 *
 * @param {Object} props
 * @param {string} props.icon - FontAwesome icon class (e.g., "fa-user", "fa-folder")
 * @param {string} props.label - Item label text
 * @param {number} props.count - Optional count badge
 * @param {boolean} props.active - Whether item is currently selected
 * @param {boolean} props.showCheck - Show check icon when active
 * @param {boolean} props.special - Use special styling (for "All Images", "Unfiled", etc.)
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Additional content to render after label
 */
export const ListItem = ({
  icon,
  label,
  count,
  active = false,
  showCheck = false,
  special = false,
  onClick,
  className = '',
  children,
  ...props
}) => {
  const classNames = [
    'ds-list-item',
    active && 'ds-list-item--active',
    special && 'ds-list-item--special',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classNames} onClick={onClick} {...props}>
      <i className={`fa ${icon} ds-list-item__icon`}></i>
      <span className="ds-list-item__label">{label}</span>
      {count !== undefined && count !== null && (
        <span className="ds-list-item__count">{count}</span>
      )}
      {children}
      {active && showCheck && <i className="fa fa-check ds-list-item__check"></i>}
    </button>
  );
};

export default ListItem;
