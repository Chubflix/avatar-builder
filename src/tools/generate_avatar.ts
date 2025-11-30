/**
 * Generate an avatar for a character using the queue-aware generator
 * This now delegates to app/utils/generate.ts which handles queuing and callbacks
 */

import {generateImage} from '@/app/utils/generate';
import {folderAPI} from '@/app/utils/backend-api';
import {Config} from "@/app/context/AppContext";
import {getConfig} from '@/actions/config';
import {getUserSettings} from "@/actions/settings";
import {createFolder, getFolders} from "@/actions/folders";


export interface AvatarGenerationOptions {
    description: string;
    orientation?: 'portrait' | 'landscape' | 'square';
    batchSize?: number;
    enhanceFace?: boolean;
    negativePrompt?: string;
}

// Legacy type no longer used; generateAvatar now returns only the queue/job ID

/**
 * Generate an avatar image for a character
 * @param characterId - The UUID of the character
 * @param description - Description for the avatar generation prompt
 * @param options - Additional generation options
 * @returns The generated avatar information
 */
export async function generateAvatar(
    characterId: string,
    description: string,
    options: Partial<AvatarGenerationOptions> = {}
): Promise<string> {
    // Load user settings (model/style, generation, adetailer) and dimensions from config
    let userSettings: any = {};
    let dimensions: any = {
        portrait: {width: 832, height: 1216},
        landscape: {width: 1216, height: 832},
        square: {width: 1024, height: 1024},
    };
    try {
        userSettings = await getUserSettings();
    } catch (_) {}

    let cfg: Config = {defaults: {orientation: 'portrait'} as any, dimensions: dimensions as any};

    try {
        cfg = await getConfig();
        if (cfg?.dimensions) dimensions = cfg.dimensions;
    } catch (_) {}

    const loras = cfg?.loras || [];


    const orientation = options.orientation || cfg.defaults.orientation;
    const batchSize = options.batchSize || 1;
    const negativePrompt = options.negativePrompt || (userSettings?.chat_img_settings?.negative_prefix || '');

    // Compose generation config from user settings
    const generation = {
        samplerName: userSettings?.generation_settings?.samplerName || 'DPM++ 2M',
        scheduler: userSettings?.generation_settings?.scheduler || 'Karras',
        steps: userSettings?.generation_settings?.steps ?? 25,
        cfgScale: userSettings?.generation_settings?.cfgScale ?? 7,
    };
    const adetailer_list = Array.isArray(userSettings?.adetailer_settings)
        ? userSettings.adetailer_settings
        : [];
    const selectedModel = (userSettings?.chat_img_settings?.model || '').trim();

    // Ensure there is a character folder named "Avatar"
    let folderId: string | null;
    try {
        const folders = await getFolders({characterId});
        const avatarFolder = Array.isArray(folders)
            ? folders.find((f: any) => f?.name === 'Avatar')
            : null;
        if (avatarFolder?.id) {
            folderId = avatarFolder.id;
        } else {
            const created = await createFolder({name: 'Avatar', description: null, character_id: characterId});
            folderId = created?.id || null;
        }
    } catch (e: Error | any) {
        // If folder operations fail, proceed without a folder
        folderId = null;
    }

    const config = {generation, adetailer_list, dimensions, loras};

    // Submit job via new generator (handles queueing)
    const payload = {
        config,
        positivePrompt: description,
        selectedModel: selectedModel,
        negativePrompt,
        orientation,
        batchSize,
        seed: Math.floor(Math.random() * 2_000_000_000),
        selectedFolder: folderId,
        characterId,
        loraSliders: {},
        loraToggles: {},
        loraStyle: userSettings?.chat_img_settings?.style || '',
        initImage: null,
        denoisingStrength: 0.5,
        maskImage: null,
    };

    console.log('Generating avatar with payload:', payload);

    const {jobId, success} = await generateImage(payload);

    if (!success) {
        throw new Error('Failed to queue avatar generation');
    }

    // Return only the queue/job ID
    return jobId || 'queued';
}