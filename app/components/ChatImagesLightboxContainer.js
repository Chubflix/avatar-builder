'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Lightbox from './Lightbox';
import ChatActions from './ChatActions';

/**
 * ChatImagesLightboxContainer
 * Minimal Lightbox container for selecting an image to attach to chat.
 * Mirrors the structure used for LoRAs (ExternalImagesLightboxContainer) but
 * without generation details and with a custom ChatActions (single button).
 */
export default function ChatImagesLightboxContainer({
    show = false,
    images = [], // [{ url, id?, width?, height?, caption? }]
    initialIndex = 0,
    onClose,
    onAttach
}) {
    const [lightboxIndex, setLightboxIndex] = useState(show ? initialIndex : null);

    useEffect(() => {
        if (show) setLightboxIndex(Number(initialIndex) || 0);
        else setLightboxIndex(null);
    }, [show, initialIndex]);

    const filteredImages = useMemo(() => Array.isArray(images) ? images : [], [images]);
    const currentImage = useMemo(() => {
        if (lightboxIndex === null) return null;
        return filteredImages[lightboxIndex] || null;
    }, [filteredImages, lightboxIndex]);

    const handleNavigate = useCallback((newIndex) => {
        if (newIndex >= 0 && newIndex < filteredImages.length) {
            setLightboxIndex(newIndex);
        }
    }, [filteredImages.length]);

    const handleClose = useCallback(() => {
        setLightboxIndex(null);
        if (onClose) onClose();
    }, [onClose]);

    if (!show || lightboxIndex === null) return null;

    return (
        <Lightbox
            images={filteredImages}
            filteredImages={filteredImages}
            currentImage={currentImage}
            filteredLightboxIndex={lightboxIndex}
            lightboxIndex={lightboxIndex}
            hasMore={false}
            isLoadingMore={false}
            onClose={handleClose}
            onNavigate={handleNavigate}
            onLoadMore={() => {}}
        >
            <Lightbox.Overlay>
                <Lightbox.Content>
                    {/* Top-right controls: close, zoom toggle, and details toggle */}
                    <Lightbox.Controls />
                    <Lightbox.Navigation />
                    <div className="lightbox-main-content">
                        <Lightbox.Image />
                    </div>
                    <div className="lightbox-content-wrapper">
                        {/* Bottom metadata / index info */}
                        <Lightbox.Info />
                        {/* Single action to attach image into the chat */}
                        <ChatActions onAttach={onAttach} />
                    </div>
                </Lightbox.Content>
            </Lightbox.Overlay>
        </Lightbox>
    );
}
