/**
 * S3 Client-side helpers (TypeScript)
 * Keep storage URL building and simple fetch-based operations on the client.
 */

/**
 * Build public URL for an object
 */
export function getImageUrl(storagePath?: string | null): string | null {
  if (!storagePath) return null;
  const base = (process.env.NEXT_PUBLIC_IMAGES_BASE_URL as string | undefined)
    || (process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL as string | undefined)
    || (process.env.S3_PUBLIC_BASE_URL as string | undefined);
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${String(storagePath).replace(/^\//, '')}`;
}

/**
 * Client must not delete from S3 directly.
 */
export async function deleteImage(_storagePath: string): Promise<never> {
  throw new Error('deleteImage is not supported client-side. Use backend API to delete images.');
}

/**
 * Download an image via its public URL
 */
export async function downloadImage(storagePath: string): Promise<Blob> {
  const url = getImageUrl(storagePath);
  if (!url) throw new Error('Missing image URL');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to download image');
  return await resp.blob();
}
