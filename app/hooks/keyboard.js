import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Hook for gallery-specific keyboard shortcuts
 */
export function useGalleryKeyboardShortcuts() {
    const { state, dispatch, actions } = useApp();

    useEffect(() => {
        const handleKeyPress = (e) => {
            // If the inpaint tool is open, do not handle gallery shortcuts
            if (state.showInpaintModal) return;
            // Ignore if user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 's' key: Start selection mode (if not already selecting and images exist)
            if ((e.key === 's' || e.key === 'S') && !state.isSelecting && state.images.length > 0) {
                e.preventDefault();
                dispatch({ type: actions.SET_IS_SELECTING, payload: true });
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [state.isSelecting, state.images.length, state.showInpaintModal, dispatch, actions]);
}
