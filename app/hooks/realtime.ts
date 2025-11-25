// @ts-nocheck
import {useApp} from "@/app/context/AppContext";
import {useEffect, useRef} from "react";
import { getAblyRealtime } from "@/app/lib/ably";
import debug from "@/app/utils/debug";
import {imageAPI} from "@/app/utils/backend-api";

/**
 * Hook to subscribe to realtime image events (saved, updated, moved, deleted)
 */
export function useImagesRealtime() {
    const { state, dispatch, actions } = useApp();

    const selectedFolderRef = useRef(state.selectedFolder);
    const selectedCharacterRef = useRef(state.selectedCharacter);
    const imagesRef = useRef(state.images);
    const currentFolderRef = useRef(state.currentFolder);

    useEffect(() => { selectedFolderRef.current = state.selectedFolder; }, [state.selectedFolder]);
    useEffect(() => { selectedCharacterRef.current = state.selectedCharacter; }, [state.selectedCharacter]);
    useEffect(() => { imagesRef.current = state.images; }, [state.images]);
    useEffect(() => { currentFolderRef.current = state.currentFolder; }, [state.currentFolder]);

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
                    // Viewing a character - character must match
                    if (character_id !== selectedCharId) {
                        return;
                    }

                    // Check folder matching
                    let folderMatches = false;
                    if (!selectedFolder || selectedFolder === '') {
                        // When no folder selected, show all images for this character
                        folderMatches = true;
                    } else if (selectedFolder === 'unfiled') {
                        // Should not normally happen when character is selected, but handle it
                        folderMatches = folder_id == null;
                    } else {
                        // Specific folder selected
                        folderMatches = String(folder_id || '') === String(selectedFolder);
                    }

                    if (!folderMatches) return;
                } else {
                    // No character selected - check view mode
                    if (selectedFolder === 'unfiled') {
                        // Viewing "Unfiled" - only add images with no folder AND no character
                        if (folder_id != null || character_id != null) {
                            return;
                        }
                    } else if (selectedFolder && selectedFolder !== '') {
                        // Viewing a specific folder (without character context)
                        if (String(folder_id || '') !== String(selectedFolder)) {
                            return;
                        }
                    }
                    // else: viewing "All Images" - add everything
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
