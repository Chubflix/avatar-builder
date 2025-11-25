/**
 * Config API
 * Loads configuration from database (user_settings + global_settings)
 * Falls back to config.json if database is not available
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // If not authenticated, return static config as fallback
        if (authError || !user) {
            return getStaticConfig();
        }

        // Load user settings
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Load global settings
        const { data: globalSettings } = await supabase
            .from('global_settings')
            .select('*');

        // If database tables don't exist yet, fall back to static config
        if (!globalSettings && !userSettings) {
            return getStaticConfig();
        }

        // Convert database format to config.json format
        const loras = globalSettings?.find(s => s.key === 'loras')?.value || [];
        const dimensions = globalSettings?.find(s => s.key === 'dimensions')?.value || {
            portrait: { width: 832, height: 1216 },
            landscape: { width: 1216, height: 832 },
            square: { width: 1024, height: 1024 }
        };

        // Build config object matching existing format
        const config = {
            defaults: {
                positivePrompt: userSettings?.default_positive_prompt || '',
                negativePrompt: userSettings?.default_negative_prompt || '',
                orientation: userSettings?.default_dimension || 'portrait',
                batchSize: userSettings?.default_batch_size || 1
            },
            generation: userSettings?.generation_settings || {
                samplerName: 'DPM++ 2M',
                scheduler: 'Karras',
                steps: 25,
                cfgScale: 7
            },
            adetailer: userSettings?.adetailer_settings || {
                enabled: true,
                model: 'face_yolov8n.pt'
            },
            dimensions,
            loras: Array.isArray(loras) ? loras : []
        };

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error loading config from database:', error);
        // Fall back to static config on error
        return getStaticConfig();
    }
}

function getStaticConfig() {
    try {
        let configPath = path.join(process.cwd(), 'config.json');
        if (!fs.existsSync(configPath)) {
            configPath = path.join(process.cwd(), 'config.default.json');
        }

        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return NextResponse.json(configData);
    } catch (error) {
        console.error('Error reading static config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
