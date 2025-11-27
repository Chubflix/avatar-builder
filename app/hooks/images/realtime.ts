// @ts-nocheck
import {useEffect, useRef} from "react";
import { getAblyRealtime } from "@/app/lib/ably";
import debug from "@/app/utils/debug";
import {imageAPI} from "@/app/utils/backend-api";

/**
 * Hook to subscribe to realtime image events (saved, updated, moved, deleted)
 */
export function useRealtimeImages({
    selectedFolder,
    selectedCharacter,
    images,
    onAddImage,
}) {

    const selectedFolderRef = useRef(selectedFolder);
    const selectedCharacterRef = useRef(selectedCharacter);
    const imagesRef = useRef(images);

    useEffect(() => { selectedFolderRef.current = selectedFolder; }, [selectedFolder]);
    useEffect(() => { selectedCharacterRef.current = selectedCharacter; }, [selectedCharacter]);
    useEffect(() => { imagesRef.current = images; }, [images]);

    useEffect(() => {
        // Subscribe to Ably channel 'images' for image_saved events
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('Realtime Images', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('images');

        debug.log('Realtime Images', 'subscribed to Ably channel #images');
        const onImageSaved = async (payload) => {
            debug.log('Realtime Images', "received a message via Ably on #images", payload);

            try {
                // Ably message: { name, data }
                const data = payload?.data ?? payload?.payload ?? payload;
                const { id, folder_id, character_id } = data || {};
                if (!id) return;

                const selectedCharId = selectedCharacterRef.current?.id || null;
                const selectedFolder = selectedFolderRef.current; // '' | 'unfiled' | <id>

                debug.log('Realtime Images', 'received image_saved event', { id, folder_id, character_id, selectedCharId, selectedFolder });

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

                debug.log('Realtime Images', 'image matches view filters, adding to state');

                // Prevent duplicates
                if (imagesRef.current?.some(img => String(img.id) === String(id))) return;

                debug.log('Realtime Images', 'image does not exist in state, adding');

                // Fetch the full image via API and add to state
                const image = await imageAPI.getById(id);
                if (image) {
                    debug.log('Realtime Images', 'image fetched from API', { id, image });
                    onAddImage(image);
                } else {
                    debug.warn('Realtime Images', 'Failed to fetch image from API', { id });
                }
            } catch (err) {
                // Non-fatal
                debug.warn('Realtime Images', 'Failed to process image_saved event', err);
            }
        };

        channel.subscribe('image_saved', onImageSaved);

        return () => {
            try { channel.unsubscribe('image_saved', onImageSaved); } catch (_) { /* noop */ }
            try { realtime.channels.release('images'); } catch (_) { /* noop */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onAddImage]);
}
