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
    onUpdateImage,
    onRemoveImage,
}) {

    const selectedFolderRef = useRef(selectedFolder);
    const selectedCharacterRef = useRef(selectedCharacter);
    const imagesRef = useRef(images);

    useEffect(() => { selectedFolderRef.current = selectedFolder; }, [selectedFolder]);
    useEffect(() => { selectedCharacterRef.current = selectedCharacter; }, [selectedCharacter]);
    useEffect(() => { imagesRef.current = images; }, [images]);

    useEffect(() => {
        // Subscribe to Ably channel 'images' for image events
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('Realtime Images', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('images');

        debug.log('Realtime Images', 'subscribed to Ably channel #images');

        const matchesCurrentView = ({ folder_id, character_id }) => {
            const selectedCharId = selectedCharacterRef.current?.id || null;
            const selectedFolder = selectedFolderRef.current; // '' | 'unfiled' | <id>

            if (selectedCharId) {
                if (character_id !== selectedCharId) return false;
                if (!selectedFolder || selectedFolder === '') return true;
                if (selectedFolder === 'unfiled') return folder_id == null;
                return String(folder_id || '') === String(selectedFolder);
            } else {
                if (selectedFolder === 'unfiled') {
                    return folder_id == null && character_id == null;
                } else if (selectedFolder && selectedFolder !== '') {
                    return String(folder_id || '') === String(selectedFolder);
                }
                // All Images
                return true;
            }
        };

        const fetchAndAddIfNeeded = async (id) => {
            if (imagesRef.current?.some(img => String(img.id) === String(id))) return;
            const image = await imageAPI.getById(id);
            if (image && onAddImage) onAddImage(image);
        };

        // image_saved → consider add if it matches current view
        const onImageSaved = async (payload) => {
            try {
                const data = payload?.data ?? payload?.payload ?? payload;
                const { id } = data || {};
                if (!id) return;

                // get metadata to test match if present; otherwise fetch and then test
                // We already receive folder_id/character_id from server events
                if (matchesCurrentView(data)) {
                    await fetchAndAddIfNeeded(id);
                }
            } catch (err) {
                debug.warn('Realtime Images', 'Failed to process image_saved event', err);
            }
        };

        // image_updated → update if present and still matches view; if not present but matches, add
        const onImageUpdated = async (payload) => {
            try {
                const data = payload?.data ?? payload?.payload ?? payload;
                const { id } = data || {};
                if (!id) return;
                const image = await imageAPI.getById(id);
                if (!image) return;
                const inList = imagesRef.current?.some(img => String(img.id) === String(id));
                if (matchesCurrentView({ folder_id: image.folder_id, character_id: image.character_id })) {
                    if (inList) {
                        if (onUpdateImage) onUpdateImage(image);
                    } else {
                        if (onAddImage) onAddImage(image);
                    }
                } else if (inList) {
                    // Updated but no longer matches filter (edge case)
                    if (onRemoveImage) onRemoveImage(id);
                }
            } catch (err) {
                debug.warn('Realtime Images', 'Failed to process image_updated event', err);
            }
        };

        // image_deleted → remove if present
        const onImageDeleted = async (payload) => {
            try {
                const data = payload?.data ?? payload?.payload ?? payload;
                const { id } = data || {};
                if (!id) return;
                if (imagesRef.current?.some(img => String(img.id) === String(id))) {
                    if (onRemoveImage) onRemoveImage(id);
                }
            } catch (err) {
                debug.warn('Realtime Images', 'Failed to process image_deleted event', err);
            }
        };

        channel.subscribe('image_saved', onImageSaved);
        channel.subscribe('image_updated', onImageUpdated);
        channel.subscribe('image_moved', onImageUpdated);
        channel.subscribe('image_deleted', onImageDeleted);

        return () => {
            try { channel.unsubscribe('image_saved', onImageSaved); } catch { /* noop */ }
            try { channel.unsubscribe('image_updated', onImageUpdated); } catch { /* noop */ }
            try { channel.unsubscribe('image_moved', onImageUpdated); } catch { /* noop */ }
            try { channel.unsubscribe('image_deleted', onImageDeleted); } catch { /* noop */ }
            try { realtime.channels.release('images'); } catch { /* noop */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onAddImage, onUpdateImage, onRemoveImage]);
}
