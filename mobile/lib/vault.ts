/**
 * vault.ts — small, pure view helpers shared across the Vault UI.
 *
 * Kept framework-free (no React, no store imports) so they can be unit-reasoned
 * about and reused by the sync overlay, sync button, error banner and stats row.
 */

import type { Document } from '@/types/document';

// A sync is considered "stale" (worth nudging the user about) after 2 hours.
export const SYNC_STALE_MS = 2 * 60 * 60 * 1000;

/**
 * Best-effort count of items not yet confirmed in cloud storage. The sync layer
 * doesn't expose a precise dirty set, so we approximate: documents without a
 * storageUrl (never uploaded, or upload failed) plus pending deletions that
 * still need to be pushed. Good enough to drive a "needs sync" badge.
 */
export function getPendingSyncCount(
  documents: Document[],
  deletedDocumentIds: string[],
  deletedFolderIds: string[],
): number {
  const notUploaded = documents.reduce((n, d) => (d.storageUrl ? n : n + 1), 0);
  return notUploaded + deletedDocumentIds.length + deletedFolderIds.length;
}

/** Total bytes stored locally across all documents. */
export function getTotalStorageBytes(documents: Document[]): number {
  return documents.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0);
}

/** Human-readable byte size, e.g. "3.2 GB". */
export function formatStorageSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const rounded = i === 0 || value >= 100 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[i]}`;
}

/** Compact relative time, e.g. "just now", "5m ago", "2h ago", "Jan 4". */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never';
  const diff = Date.now() - then;
  if (diff < 45_000) return 'just now';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** True when the last successful sync is missing or older than SYNC_STALE_MS. */
export function isSyncStale(lastSuccessfulSyncAt: string | null): boolean {
  if (!lastSuccessfulSyncAt) return true;
  const then = new Date(lastSuccessfulSyncAt).getTime();
  if (Number.isNaN(then)) return true;
  return Date.now() - then > SYNC_STALE_MS;
}

/**
 * Maps a raw sync error message to a short, user-facing reason. The underlying
 * error strings come from fetch/timeout/HTTP failures and aren't presentable.
 */
export function describeSyncError(raw: string | null): string {
  if (!raw) return 'Sync failed';
  const msg = raw.toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return 'Connection timed out';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) return 'Connection lost';
  if (msg.includes('401') || msg.includes('403') || msg.includes('token') || msg.includes('unauthorized')) {
    return 'Session expired';
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return 'Cloud storage unavailable';
  return 'Sync failed';
}
