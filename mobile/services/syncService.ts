import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, isBackendConfigured } from '@/services/api';
import type { Document, Folder } from '@/types/document';

export type SyncResult = {
  pushed: number;
  pushedDeletedDocuments: number;
  pushedDeletedFolders: number;
  pulledDocuments: number;
  pulledFolders: number;
  pulledTombstones: number;
  syncVersion: number;
};

type SyncPullResponse = {
  syncVersion: number;
  documents: Document[];
  folders: Folder[];
  tombstones: Tombstone[];
};

type SyncPushResponse = {
  ok: boolean;
  syncVersion: number;
};

const DEVICE_ID_KEY = 'filetrail-device-id';
const SYNC_VERSION_KEY = 'filetrail-sync-version';

export type Tombstone = {
  id: string;
  kind: 'document' | 'folder';
  deletedAt?: string;
  syncVersion: number;
};

async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

async function getLastSyncVersion(): Promise<number> {
  const raw = await AsyncStorage.getItem(SYNC_VERSION_KEY);
  return raw ? Number(raw) || 0 : 0;
}

async function setLastSyncVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(SYNC_VERSION_KEY, String(version));
}

/**
 * Forgets this device's sync identity and last-synced version, so the next
 * sync re-registers as a new device and pulls a full snapshot from the server.
 * Useful for testing sync from a clean slate, or recovering from a device
 * stuck pushing/pulling against a stale syncVersion.
 */
export async function resetSyncState(): Promise<void> {
  await AsyncStorage.multiRemove([DEVICE_ID_KEY, SYNC_VERSION_KEY]);
}

export async function syncMetadata(input: {
  documents: Document[];
  folders: Folder[];
  deletedDocumentIds: string[];
  deletedFolderIds: string[];
  mergeDocuments: (documents: Document[]) => void;
  mergeFolders: (folders: Folder[]) => void;
  applyTombstones: (tombstones: Tombstone[]) => void | Promise<void>;
  markDeletesSynced: (documentIds: string[], folderIds: string[]) => void;
}): Promise<SyncResult | null> {
  if (!isBackendConfigured()) return null;

  const deviceId = await getDeviceId();
  const sinceVersion = await getLastSyncVersion();

  const push = await apiRequest<SyncPushResponse>('/v1/sync/push', {
    method: 'POST',
    body: {
      deviceId,
      documents: input.documents,
      folders: input.folders,
      deletedDocumentIds: input.deletedDocumentIds,
      deletedFolderIds: input.deletedFolderIds,
    },
  });

  // Guard: if the server accepted the request but reports a logical failure, do
  // NOT clear local tombstones — they must be re-sent on the next sync cycle.
  if (!push.ok) {
    throw new Error('[sync] push rejected by server (ok: false)');
  }

  const pull = await apiRequest<SyncPullResponse>('/v1/sync/pull', {
    method: 'POST',
    body: { deviceId, sinceVersion },
  });

  // Apply pulled data. All three steps must complete before we clear tombstones.
  // If applyTombstones throws (e.g. a file-delete fails), markDeletesSynced is
  // not reached and the tombstones are retried on the next sync — intentional.
  if (pull.documents.length > 0) input.mergeDocuments(pull.documents);
  if (pull.folders.length > 0) input.mergeFolders(pull.folders);
  if (pull.tombstones.length > 0) await input.applyTombstones(pull.tombstones);

  // Only reached if push confirmed AND pull+apply all succeeded.
  // Pass the snapshot IDs that were sent, not the current live state, so any
  // deletions that happened mid-sync are preserved for the next cycle.
  input.markDeletesSynced(input.deletedDocumentIds, input.deletedFolderIds);

  const syncVersion = Math.max(push.syncVersion, pull.syncVersion);
  await setLastSyncVersion(syncVersion);

  return {
    pushed: input.documents.length + input.folders.length,
    pushedDeletedDocuments: input.deletedDocumentIds.length,
    pushedDeletedFolders: input.deletedFolderIds.length,
    pulledDocuments: pull.documents.length,
    pulledFolders: pull.folders.length,
    pulledTombstones: pull.tombstones.length,
    syncVersion,
  };
}
