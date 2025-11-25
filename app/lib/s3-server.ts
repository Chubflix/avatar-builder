/**
 * S3 Server-side helpers (TypeScript)
 * Centralizes all S3 operations for server routes and services.
 */

import {S3Client, PutObjectCommand, DeleteObjectCommand, ObjectCannedACL} from '@aws-sdk/client-s3';

/**
 * Build public URL for an image/object
 */
export function getImageUrl(storagePath?: string | null): string | null {
  if (!storagePath) return null;
  const base = (process.env.NEXT_PUBLIC_IMAGES_BASE_URL as string | undefined) || (process.env.S3_PUBLIC_BASE_URL as string | undefined);
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${String(storagePath).replace(/^\//, '')}`;
}

function getS3Client() {
  const region = process.env.S3_REGION as string | undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID as string | undefined;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY as string | undefined;
  const endpoint = process.env.S3_ENDPOINT as string | undefined; // optional for R2/MinIO
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

export async function s3Upload({ bucket, key, body, contentType = 'image/png', cacheControl = '3600' }: { bucket: string; key: string; body: Buffer | Uint8Array | Blob | string; contentType?: string; cacheControl?: string; }) {
  const client = getS3Client();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body as any,
    ContentType: contentType,
    CacheControl: cacheControl,
    ACL: ObjectCannedACL.public_read,
  });
  await client.send(cmd);
}

export async function s3Delete({ bucket, key }: { bucket: string; key: string; }) {
  const client = getS3Client();
  const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await client.send(cmd);
}

export async function deleteImageFromStorage(storagePath: string) {
  const bucket = process.env.S3_BUCKET as string | undefined;
  if (!bucket) throw new Error('Missing S3_BUCKET');
  try {
    await s3Delete({ bucket, key: storagePath });
  } catch (e: any) {
    console.warn('S3 delete failed:', e?.message || e);
  }
}
