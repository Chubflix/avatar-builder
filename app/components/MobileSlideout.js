'use client';

import { useState, useEffect, useRef } from 'react';
import './MobileSlideout.css';

/**
 * Reusable fullscreen mobile slideout component
 * @param {boolean} show - Whether to show the slideout
 * @param {function} onClose - Callback when closing
 * @param {string} title - Title to display in header
 * @param {React.ReactNode} children - Content to render in body
 */
function MobileSlideout({ show, onClose, title, children }) {
    const [isVisible, setIsVisible] = useState(show);
    const [isClosing, setIsClosing] = useState(false);
    const prevShowRef = useRef(show);

    // Watch for show prop changes to trigger animated close
    useEffect(() => {
        if (prevShowRef.current && !show) {
            // Changed from true to false - trigger closing animation
            setIsClosing(true);
            setTimeout(() => {
                setIsVisible(false);
                setIsClosing(false);
            }, 300);
        } else if (!prevShowRef.current && show) {
            // Changed from false to true - show immediately
            setIsVisible(true);
            setIsClosing(false);
        }
        prevShowRef.current = show;
    }, [show]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    if (!isVisible) return null;

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
