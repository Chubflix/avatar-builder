/**
 * Config API
 * Loads configuration from database (user_settings + global_settings)
 * Falls back to config.json if database is not available
 */

import {NextResponse} from 'next/server';
import {getConfig} from '@/actions/config';

export async function GET() {
    try {
        return NextResponse.json(await getConfig());
    } catch (error) {
        console.error('Error reading static config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}