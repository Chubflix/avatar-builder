/**
 * Supabase Server Client (TypeScript)
 * For use in API routes and server components.
 * Uses @supabase/ssr for proper Next.js cookie handling.
 */

import { cookies } from 'next/headers';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { getImageUrl, s3Upload, s3Delete } from './s3-server';
import { getAblyRest } from './ably';
import type { Mask } from '@/types/mask';
import { v4 as uuidv4 } from 'uuid';

// Optional Image type for future extension (not strictly required here)
// import type { Image as ImageAsset } from '@/types/image';

export function createAuthClient() {
  const cookieStore = cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component; safe to ignore due to middleware
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Called from a Server Component; safe to ignore due to middleware
          }
        },
      },
    }
  );
}

/**
 * Legacy alias for backwards compatibility
 * @deprecated Use createAuthClient instead
 */
export function createServerClient() {
  return createAuthClient();
}

/**
 * Create Supabase service-role client (bypasses RLS). Do NOT expose to client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration');
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Get authenticated user from server */
export async function getServerUser() {
  const supabase = createAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting server user:', error);
    return null;
  }
  return user;
}

export type SaveImageMeta = {
  positivePrompt?: string;
  negativePrompt?: string;
  model?: string;
  orientation?: string;
  width?: number;
  height?: number;
  batchSize?: number;
  samplerName?: string;
  scheduler?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  adetailerEnabled?: boolean;
  adetailerModel?: string | null;
  info?: any;
  folderId?: string | null;
  loras?: any;
  generationType?: 'txt2img' | 'img2img' | 'inpaint' | 'uploaded';
  parentImageId?: string | null;
  maskId?: string | null;
  tags?: string[];
};

/**
 * Persist a generated image to Storage and the images table.
 */
export async function saveGeneratedImage({
  supabase,
  userId,
  imageBase64,
  meta = {},
}: {
  supabase: SupabaseClient;
  userId: string;
  imageBase64: string;
  meta?: SaveImageMeta;
}) {
  if (!supabase) throw new Error('saveGeneratedImage: supabase client is required');
  if (!userId) throw new Error('saveGeneratedImage: userId is required');
  if (!imageBase64) throw new Error('saveGeneratedImage: imageBase64 is required');

  const {
    positivePrompt,
    negativePrompt,
    model,
    orientation,
    width,
    height,
    batchSize,
    samplerName,
    scheduler,
    steps,
    cfgScale,
    seed,
    adetailerEnabled,
    adetailerModel,
    info,
    folderId,
    loras,
    generationType = 'txt2img',
    parentImageId = null,
    maskId = null,
    tags = [],
  } = meta;

  // Normalize base64 (strip data URL if present)
  const normalized = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const buffer = Buffer.from(normalized, 'base64');

  const id = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID()
    : uuidv4();
  const filename = `${id}.png`;
  const storagePath = `${userId}/${filename}`;

  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('Missing S3_BUCKET');
  await s3Upload({ bucket, key: storagePath, body: buffer, contentType: 'image/png', cacheControl: '31536000' });

  const { data: image, error } = await supabase
    .from('images')
    .insert({
      id,
      filename,
      storage_path: storagePath,
      positive_prompt: positivePrompt,
      negative_prompt: negativePrompt,
      model,
      orientation,
      width,
      height,
      batch_size: batchSize,
      sampler_name: samplerName,
      scheduler,
      steps,
      cfg_scale: cfgScale,
      seed,
      adetailer_enabled: adetailerEnabled,
      adetailer_model: adetailerModel,
      info_json: info || {},
      folder_id: folderId || null,
      loras: loras || null,
      generation_type: generationType,
      parent_image_id: parentImageId,
      mask_id: maskId,
      tags: tags || [],
      user_id: userId,
    })
    .select(`
      *,
      folder:folders(id, name, character:characters(id, name)),
      mask:masks(id, storage_path)
    `)
    .single();

  if (error) {
    try { await s3Delete({ bucket, key: storagePath }); } catch {}
    throw error;
  }

  const result: any = {
    ...image,
    url: getImageUrl(image.storage_path),
    folder_id: image.folder_id || null,
    character_id: image.folder?.character?.id || null,
    folder_name: image.folder?.name || null,
    folder_path: image.folder ? `${image.folder.character?.name || 'Unknown'}/${image.folder.name}` : null,
    mask_url: image.mask ? getImageUrl(image.mask.storage_path) : null,
  };

  try {
    const ably = getAblyRest();
    if (!ably) { // noinspection ExceptionCaughtLocallyJS
        throw new Error('Ably REST client not configured');
    }
    const channel = ably.channels.get('images');
    await channel.publish('image_saved', {
      id: result.id,
      user_id: userId,
      storage_path: result.storage_path,
      url: result.url,
      folder_id: result.folder_id,
      character_id: result.character_id,
      created_at: result.created_at,
    });
  } catch (e: any) {
    console.warn('[Realtime] Failed to broadcast image_saved via Ably:', e?.message || e);
  }

  return result;
}

/**
 * Ensure a mask row exists for the provided mask object. Uploads to S3 if base64 provided.
 * Stores under {userId}/masks/{id}.png
 */
export async function saveMask({
  supabase,
  userId,
  mask,
}: {
  supabase: SupabaseClient;
  userId: string;
  mask: Mask;
}): Promise<string> {
  if (!mask?.id) throw new Error('saveMask: mask.id is required');
  let storagePath = mask.storage_path || null;
  if (!storagePath && mask.base64) {
    const normalized = mask.base64.includes(',') ? mask.base64.split(',')[1] : mask.base64;
    const buffer = Buffer.from(normalized, 'base64');
    storagePath = `${userId}/masks/${mask.id}.png`;
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error('Missing S3_BUCKET');
    await s3Upload({ bucket, key: storagePath, body: buffer, contentType: 'image/png', cacheControl: '31536000' });
  }

  const { data: row, error } = await supabase
    .from('masks')
    .upsert(
      {
        id: mask.id!,
        user_id: userId,
        storage_path: storagePath || mask.storage_path,
        width: (mask as any).width || null,
        height: (mask as any).height || null,
        info_json: (mask as any).info_json || {},
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return row.id as string;
}
