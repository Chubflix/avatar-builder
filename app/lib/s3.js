/**
 * S3 Client-side helpers
 * Keep storage URL building and simple fetch-based operations on the client.
 */

/**
 * Build public URL for an object
 */
export function getImageUrl(storagePath) {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_IMAGES_BASE_URL || process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${String(storagePath).replace(/^\//, '')}`;
}

/**
 * Client must not delete from S3 directly.
 */
export async function deleteImage(_storagePath) {
  throw new Error('deleteImage is not supported client-side. Use backend API to delete images.');
}

/**
 * Download an image via its public URL
 */
export async function downloadImage(storagePath) {
  const url = getImageUrl(storagePath);
  if (!url) throw new Error('Missing image URL');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to download image');
  return await resp.blob();
}
