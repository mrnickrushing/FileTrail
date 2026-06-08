/**
 * r2.ts — Cloudflare R2 file storage helpers (S3-compatible).
 *
 * Uses AWS SDK v3 S3 client pointed at R2's S3-compatible endpoint.
 * All operations are gated on R2 being configured via env vars.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string; // optional public bucket URL (e.g. https://files.filetrail.app)
};

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function r2ConfigFromEnv(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || undefined,
  };
}

/**
 * Returns a pre-signed PUT URL the mobile client can upload directly to R2.
 * Expires in 15 minutes.
 */
export async function getUploadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  mimeType: string,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(client, cmd, { expiresIn: 900 });
}

/**
 * Returns a pre-signed GET URL valid for 1 hour.
 */
export async function getDownloadUrl(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: 3600 });
}

/**
 * Deletes an object from R2. Silent on missing key.
 */
export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Derives the R2 object key for a document.
 * Format: documents/{documentId}/{sanitized-title}.{ext}
 *
 * - documentId makes each key globally unique (UUID)
 * - title gives the file a human-readable name in the bucket
 */
export function documentKey(
  documentId: string,
  mimeType: string,
  title?: string,
): string {
  const ext = mimeType.split('/')[1]?.split('+')[0] ?? 'bin';
  // Sanitize title: keep alphanumerics, spaces, hyphens, underscores, dots.
  // Collapse runs of unsafe chars into a single underscore.
  const safeName = title
    ? title
        .trim()
        .replace(/[^a-zA-Z0-9 ._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 100) || 'document'
    : 'document';
  return `documents/${documentId}/${safeName}.${ext}`;
}
