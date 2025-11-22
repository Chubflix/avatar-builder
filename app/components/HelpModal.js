'use client';

import { useState } from 'react';
import './HelpModal.css';

export default function HelpModal({ show, onClose }) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    if (!show) return null;

    const keyboardShortcuts = {
        'Gallery': [
            { key: 'Arrow Keys', description: 'Navigate between images' },
            { key: 'Enter', description: 'Open selected image in lightbox' },
            { key: 'Delete / Backspace', description: 'Delete selected image' },
        ],
        'Lightbox': [
            { key: 'Escape', description: 'Close lightbox' },
            { key: 'Arrow Left / Right', description: 'Navigate between images' },
            { key: 'Arrow Down', description: 'Close lightbox' },
            { key: 'i', description: 'Toggle generation details' },
            { key: 'd', description: 'Delete current image' },
        ]
    };

    const mobileGestures = {
        'Gallery': [
            { gesture: 'Tap', description: 'Select image' },
            { gesture: 'Long Press', description: 'Open image options' },
            { gesture: 'Swipe Left/Right', description: 'Navigate through images' },
        ],
        'Lightbox': [
            { gesture: 'Swipe Left/Right', description: 'Navigate between images' },
            { gesture: 'Swipe Up', description: 'Show generation details (when closed)' },
            { gesture: 'Swipe Down', description: 'Hide generation details or close lightbox' },
            { gesture: 'Double Tap', description: 'Zoom in/out (when details closed)' },
            { gesture: 'Drag', description: 'Pan zoomed image' },
        ]
    };

    return (
        <>
            {/* Desktop Modal */}
            <div className="help-modal desktop-only">
                <div className="modal-backdrop" onClick={handleClose}></div>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Keyboard Shortcuts</h2>
                        <button className="btn-close" onClick={handleClose}>
                            <i className="fa fa-times"></i>
                        </button>
                    </div>
                    <div className="modal-body">
                        {Object.entries(keyboardShortcuts).map(([section, shortcuts]) => (
                            <div key={section} className="help-section">
                                <h3 className="help-section-title">{section}</h3>
                                <div className="help-items">
                                    {shortcuts.map((item, index) => (
                                        <div key={index} className="help-item">
                                            <kbd className="help-key">{item.key}</kbd>
                                            <span className="help-description">{item.description}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Slide-out */}
            <div className={`help-slideout mobile-only ${isClosing ? 'closing' : ''}`}>
                <div className="slideout-header">
                    <h2>Gestures</h2>
                    <button className="btn-close" onClick={handleClose}>
                        <i className="fa fa-times"></i>
                    </button>
                </div>
                <div className="slideout-body">
                    {Object.entries(mobileGestures).map(([section, gestures]) => (
                        <div key={section} className="help-section">
                            <h3 className="help-section-title">{section}</h3>
                            <div className="help-items">
                                {gestures.map((item, index) => (
                                    <div key={index} className="help-item">
                                        <span className="help-gesture">{item.gesture}</span>
                                        <span className="help-description">{item.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
