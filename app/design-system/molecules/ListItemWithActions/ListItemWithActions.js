import React from 'react';
import { ListItem } from '@/app/design-system/molecules/ListItem';
import { IconButton } from '@/app/design-system/atoms/IconButton';
import './ListItemWithActions.css';

/**
 * ListItemWithActions - A list item with inline edit and delete actions
 *
 * Extends ListItem by adding action buttons that appear on the right side
 *
 * @param {Object} props
 * @param {string} props.icon - FontAwesome icon class
 * @param {string} props.label - Item label text
 * @param {number} props.count - Optional count badge
 * @param {boolean} props.active - Whether item is currently selected
 * @param {boolean} props.showCheck - Show check icon when active
 * @param {function} props.onClick - Click handler for the item
 * @param {function} props.onEdit - Edit button click handler
 * @param {function} props.onDelete - Delete button click handler
 * @param {string} props.className - Additional CSS classes
 */
export const ListItemWithActions = ({
  icon,
  label,
  count,
  active = false,
  showCheck = false,
  onClick,
  onEdit,
  onDelete,
  className = '',
  ...props
}) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(e);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(e);
  };

  return (
    <ListItem
      icon={icon}
      label={label}
      count={count}
      active={active}
      showCheck={showCheck}
      onClick={onClick}
      className={`ds-list-item-with-actions ${className}`}
      {...props}
    >
      <div className="ds-list-item-with-actions__actions">
        <IconButton
          icon="fa-pencil"
          variant="secondary"
          size="medium"
          onClick={handleEdit}
          title="Edit"
          className="ds-list-item-with-actions__edit"
        />
        <IconButton
          icon="fa-trash"
          variant="danger"
          size="medium"
          onClick={handleDelete}
          title="Delete"
          className="ds-list-item-with-actions__delete"
        />
      </div>
    </ListItem>
  );
};

export default ListItemWithActions;
