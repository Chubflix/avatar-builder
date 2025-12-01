/**
 * Public Characters API
 * Returns a public list of characters intended for the Browse page.
 * No authentication required. Only non-sensitive fields are returned.
 */

import {NextResponse} from 'next/server';
import {createAuthClient} from '@/app/lib/supabase-server';
import {getAllCharacters} from "@/actions/character";
import {handleError} from "@/app/errors/ErrorHandler";

export async function GET() {
    try {
        const characters = await getAllCharacters();

        return NextResponse.json(characters);
    } catch (err) {
        return handleError(err)
    }
}
