import React from 'react';
import './IconButton.css';

/**
 * IconButton - A button component that displays only an icon
 *
 * Used for actions like close, edit, delete, save, cancel throughout the UI
 *
 * @param {Object} props
 * @param {string} props.icon - FontAwesome icon class (e.g., "fa-times", "fa-pencil")
 * @param {function} props.onClick - Click handler
 * @param {'primary'|'secondary'|'danger'|'ghost'} props.variant - Visual style variant
 * @param {'small'|'medium'|'large'} props.size - Button size
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.title - Tooltip text
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.type - Button type attribute
 */
export const IconButton = ({
  icon,
  onClick,
  variant = 'secondary',
  size = 'medium',
  disabled = false,
  title,
  className = '',
  type = 'button',
  ...props
}) => {
  const classNames = [
    'ds-icon-button',
    `ds-icon-button--${variant}`,
    `ds-icon-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      title={title}
      {...props}
    >
      <i className={`fa ${icon}`}></i>
    </button>
  );
};

export default IconButton;
