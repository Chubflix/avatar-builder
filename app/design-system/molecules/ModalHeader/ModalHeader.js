import React from 'react';
import { IconButton } from '@/app/design-system/atoms/IconButton';
import './ModalHeader.css';

/**
 * ModalHeader - Header section for modal dialogs
 *
 * Combines a title with a close button
 *
 * @param {Object} props
 * @param {string} props.title - Modal title text
 * @param {function} props.onClose - Close button click handler
 * @param {string} props.className - Additional CSS classes
 */
export const ModalHeader = ({ title, onClose, className = '' }) => {
  const classNames = ['ds-modal-header', className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <h4 className="ds-modal-header__title">{title}</h4>
      <IconButton
        icon="fa-times"
        variant="ghost"
        size="medium"
        onClick={onClose}
        title="Close"
        className="ds-modal-header__close"
      />
    </div>
  );
};

export default ModalHeader;
