import {useApp} from "@/app/context/AppContext";
import {useEffect, useRef} from "react";
import { getAblyRealtime } from "@/app/lib/ably";

/**
 * Hook to subscribe to realtime image_saved events and append matching images
 */
export function useImagesRealtime() {
    const { state, dispatch, actions } = useApp();

    const selectedFolderRef = useRef(state.selectedFolder);
    const selectedCharacterRef = useRef(state.selectedCharacter);
    const imagesRef = useRef(state.images);

    useEffect(() => { selectedFolderRef.current = state.selectedFolder; }, [state.selectedFolder]);
    useEffect(() => { selectedCharacterRef.current = state.selectedCharacter; }, [state.selectedCharacter]);
    useEffect(() => { imagesRef.current = state.images; }, [state.images]);

    useEffect(() => {
        // Subscribe to Ably channel 'images' for image_saved events
        const realtime = getAblyRealtime();
        if (!realtime) {
            console.warn('[Realtime] Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('images');

        console.log('subscribed to Ably channel #images');
        const onImageSaved = async (payload) => {
            console.log("received a message via Ably on #images", payload);

            try {
                // Ably message: { name, data }
                const data = payload?.data ?? payload?.payload ?? payload;
                const { id, folder_id, character_id } = data || {};
                if (!id) return;

                const selectedCharId = selectedCharacterRef.current?.id || null;
                const selectedFolder = selectedFolderRef.current; // '' | 'unfiled' | <id>

                if (selectedCharId) {
                    // Character must match current view
                    if (character_id !== selectedCharId) {
                        return;
                    }

                    // Folder matching rules
                    let folderMatches = false;
                    if (!selectedFolder || selectedFolder === '') {
                        // When no folder selected, push if character matches
                        folderMatches = true;
                    } else if (selectedFolder === 'unfiled') {
                        folderMatches = folder_id == null;
                    } else {
                        folderMatches = String(folder_id || '') === String(selectedFolder);
                    }

                    if (!folderMatches) return;
                }

                // Prevent duplicates
                if (imagesRef.current?.some(img => String(img.id) === String(id))) return;

                // Fetch the full image via API and add to state
                const image = await imageAPI.getById(id);
                if (image) {
                    dispatch({ type: actions.ADD_IMAGES, payload: [image] });
                    dispatch({ type: actions.SET_TOTAL_IMAGES, payload: (state.totalImages || 0) + 1 });
                }
            } catch (err) {
                // Non-fatal
                debug.warn('Realtime', 'Failed to process image_saved event', err);
            }
        };

        channel.subscribe('image_saved', onImageSaved);

        return () => {
            try { channel.unsubscribe('image_saved', onImageSaved); } catch (_) { /* noop */ }
            try { realtime.channels.release('images'); } catch (_) { /* noop */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}