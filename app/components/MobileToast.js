'use client';

import { useState, useEffect } from 'react';
import './MobileToast.css';

function MobileToast({ status, onDismiss }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            onDismiss();
        }, 300); // Match animation duration
    };

    useEffect(() => {
        if (status) {
            setIsVisible(true);
            setIsExiting(false);

            const timer = setTimeout(() => {
                handleDismiss();
            }, 3000); // Show for 3 seconds

            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            setIsExiting(false);
        }
    }, [status]); // Remove onDismiss from deps to avoid re-triggering

    if (!isVisible || !status) return null;

    return (
        <div
            className={`mobile-toast ${status.type} ${isExiting ? 'exiting' : ''}`}
            onClick={handleDismiss}
        >
            <div className="toast-content">
                <i className={`fa fa-${status.type === 'error' ? 'exclamation-circle' : status.type === 'success' ? 'check-circle' : 'info-circle'}`}></i>
                <span>{status.message}</span>
            </div>
        </div>
    );
}

export default MobileToast;
