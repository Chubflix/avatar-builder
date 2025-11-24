/**
 * S3 Server-side helpers
 * Centralizes all S3 operations for server routes and services.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Build public URL for an image/object
 */
export function getImageUrl(storagePath) {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_IMAGES_BASE_URL || process.env.S3_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${String(storagePath).replace(/^\//, '')}`;
}

function getS3Client() {
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT; // optional for R2/MinIO
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing S3 configuration (S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)');
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint: endpoint || undefined,
    forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE || undefined,
  });
}

export async function s3Upload({ bucket, key, body, contentType = 'image/png', cacheControl = '3600' }) {
  const client = getS3Client();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
    ACL: process.env.S3_OBJECT_ACL || 'public-read',
  });
  await client.send(cmd);
}

export async function s3Delete({ bucket, key }) {
  const client = getS3Client();
  const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await client.send(cmd);
}

export async function uploadImage(file, storagePath) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('Missing S3_BUCKET');
  await s3Upload({ bucket, key: storagePath, body: file, contentType: 'image/png' });
}

export async function uploadImageWithService(file, storagePath) {
  // same as uploadImage — service role not applicable to S3
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('Missing S3_BUCKET');
  await s3Upload({ bucket, key: storagePath, body: file, contentType: 'image/png' });
}

export async function deleteImageFromStorage(storagePath) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('Missing S3_BUCKET');
  try {
    await s3Delete({ bucket, key: storagePath });
  } catch (e) {
    console.warn('S3 delete failed:', e?.message || e);
  }
}
