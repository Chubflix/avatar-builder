'use server'

import {createAuthClient} from '@/app/lib/supabase-server';
import Unauthorized from "@/app/errors/Http/Unauthorized";

export async function getUserSettings() {
    const supabase = createAuthClient();
    const {data: {user}, error: authError} = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Unauthorized();
    }

    // Get or create user settings
    let {data: settings, error} = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // If no settings exist, create default settings
    if (error && error.code === 'PGRST116') {
        const {data: newSettings, error: insertError} = await supabase
            .from('user_settings')
            .insert({
                user_id: user.id,
                generation_settings: {},
                // Store as an array of items (model + enabled)
                adetailer_settings: [],
                // Chat image generation settings (model, style, prefixes)
                chat_img_settings: {}
            })
            .select()
            .single();

        if (insertError) throw insertError;
        settings = newSettings;
    } else if (error) {
        throw error;
    }

    return settings;

}