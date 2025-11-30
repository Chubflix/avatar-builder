/**
 * Folders API
 * Manages folder CRUD operations (folders belong to characters)
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { publishRealtimeEvent } from '@/app/lib/ably';
import { getFolders, createFolder } from '@/actions/folders';
import {handleError} from "@/app/errors/ErrorHandler";

// GET all folders for authenticated user (optionally filtered by character)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const characterId = searchParams.get('character_id');
        const folders = await getFolders({ characterId });
        return NextResponse.json(folders);
    } catch (error) {
        console.error('Error fetching folders:', error);
        return handleError(error);
    }
}

// POST create new folder
export async function POST(request) {
    try {
        const { name, description, character_id } = await request.json();
        const folder = await createFolder({ name, description, character_id });

        // Publish realtime event (kept in the route layer)
        const supabase = createAuthClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await publishRealtimeEvent('folders', 'folder_created', {
                id: folder.id,
                user_id: user.id,
                name: folder.name,
                character_id: folder.character_id
            });
        }

        return NextResponse.json(folder);
    } catch (error) {
        console.error('Error creating folder:', error);
        return handleError(error);
    }
}
