'use client';

import { useState } from 'react';
import './MobileSlideout.css';

/**
 * Reusable fullscreen mobile slideout component
 * @param {boolean} show - Whether to show the slideout
 * @param {function} onClose - Callback when closing
 * @param {string} title - Title to display in header
 * @param {React.ReactNode} children - Content to render in body
 */
function MobileSlideout({ show, onClose, title, children }) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    if (!show) return null;

    return (
        <div className={`mobile-slideout ${isClosing ? 'closing' : ''}`}>
            <div className="mobile-slideout-header">
                <h2>{title}</h2>
                <button className="btn-close" onClick={handleClose}>
                    <i className="fa fa-times"></i>
                </button>
            </div>
            <div className="mobile-slideout-body">
                {children}
            </div>
        </div>
    );
}

export default MobileSlideout;
