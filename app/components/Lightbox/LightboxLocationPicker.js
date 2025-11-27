import React from 'react';
import { useLightbox } from '@/app/context/LightboxContext';
import LocationPicker from '../LocationPicker';

/**
 * LightboxLocationPicker - Folder selection modal
 * Manages its own visibility state
 */
export function LightboxLocationPicker({ onMoveToFolder, show, onClose }) {
    const { currentImage } = useLightbox();

    const handleMoveToFolder = (folderId) => {
        if (currentImage) {
            onMoveToFolder(currentImage.id, folderId);
        }
        onClose();
    };

    if (!currentImage) return null;

    return (
        <LocationPicker
            show={show}
            onClose={onClose}
            onSelect={handleMoveToFolder}
            currentFolderId={currentImage?.folder_id}
            currentCharacterId={currentImage?.character_id}
            title="Move to Folder"
            mode="move"
        />
    );
}
