'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Lightbox from './Lightbox';
import CivitAiGenetationDetails from "@/app/components/Lightbox/CivitAiGenerationDetails";

/**
 * ExternalImagesLightboxContainer
 * A minimal container to present external images (e.g., LoRA previews) in the app Lightbox.
 * It is fully local-state and does not depend on any global context.
 */
export default function ExternalImagesLightboxContainer({
    show = false,
    images = [], // [{ url, is_nsfw?, width?, height?, caption? }]
    initialIndex = 0,
    onClose
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
                        {/* Custom CivitAI generation details registered on Lightbox to ensure it receives Provider data */}
                        <CivitAiGenetationDetails onSetModel={() => {}} />
                    </div>
                    <div className="lightbox-content-wrapper">
                        {/* Bottom metadata / index info */}
                        <Lightbox.Info />
                    </div>
                </Lightbox.Content>
            </Lightbox.Overlay>
        </Lightbox>
    );
}
