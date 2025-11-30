'use client';

import React from 'react';
import { useLightbox } from '@/app/context/LightboxContext';

/**
 * ChatActions - minimal lightbox actions for Chat flow
 * Renders a single button: "Attach to chat"
 * Expects an onAttach(currentImage) prop from the container.
 */
export default function ChatActions({ onAttach }) {
    const { currentImage } = useLightbox();

    if (!currentImage) return null;

    const handleAttach = () => {
        if (typeof onAttach === 'function') {
            onAttach(currentImage);
        }
    };

    return (
        <div className="lightbox-actions">
            <button className="image-btn primary" onClick={handleAttach} title="Attach image to chat">
                <i className="fa fa-paperclip"></i>
                <span className="btn-label">Attach to chat</span>
            </button>
        </div>
    );
}
