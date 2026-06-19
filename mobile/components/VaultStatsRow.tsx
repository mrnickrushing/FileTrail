/**
 * VaultStatsRow.tsx — at-a-glance vault metrics (#5).
 *
 * A row of four tappable stat cells below the health card. Each drills down to
 * the relevant place. The sync cell is colour-coded (green fresh / amber stale /
 * red failed) and only shown when cloud sync is enabled; otherwise the fourth
 * cell falls back to the saved-documents count.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Document, Folder } from '@/types/document';
import type { SyncState } from '@/store/documentStore';
import { getTotalStorageBytes, formatStorageSize, formatRelativeTime, isSyncStale } from '@/lib/vault';
import { C, T, R, S } from '@/theme/tokens';

interface Props {
  documents: Document[];
  folders: Folder[];
  favoriteCount: number;
  syncEnabled: boolean;
  syncState: SyncState;
  onDocs: () => void;
  onFolders: () => void;
  onStorage: () => void;
  onSync: () => void;
  onSaved: () => void;
}

export function VaultStatsRow({
  documents,
  folders,
  favoriteCount,
  syncEnabled,
  syncState,
  onDocs,
  onFolders,
  onStorage,
  onSync,
  onSaved,
}: Props) {
  const storage = formatStorageSize(getTotalStorageBytes(documents));

  let syncValue = formatRelativeTime(syncState.lastSuccessfulSyncAt);
  let syncColor: string = C.success;
  if (syncState.phase === 'error') {
    syncValue = 'Failed';
    syncColor = C.danger;
  } else if (syncState.phase === 'syncing') {
    syncValue = 'Now';
    syncColor = C.amber;
  } else if (isSyncStale(syncState.lastSuccessfulSyncAt)) {
    syncColor = C.warning;
  }

  return (
    <View style={styles.row}>
      <StatCell icon="file-text" value={String(documents.length)} label="Docs" color={C.cream} onPress={onDocs} />
      <StatCell icon="folder" value={String(folders.length)} label="Folders" color={C.cream} onPress={onFolders} />
      <StatCell icon="database" value={storage} label="Storage" color={C.cream} onPress={onStorage} />
      {syncEnabled ? (
        <StatCell icon="refresh-cw" value={syncValue} label="Synced" color={syncColor} onPress={onSync} last />
      ) : (
        <StatCell icon="star" value={String(favoriteCount)} label="Saved" color={C.cream} onPress={onSaved} last />
      )}
    </View>
  );
}

function StatCell({
  icon,
  value,
  label,
  color,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  label: string;
  color: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.cell, !last && styles.cellBorder, pressed && styles.cellPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Feather name={icon} size={14} color={C.ash} />
      <Text style={[styles.value, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    borderRadius: R.xl,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: S[3],
    paddingHorizontal: S[1],
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: C.ink3,
  },
  cellPressed: {
    backgroundColor: C.ink3 + '80',
  },
  value: {
    fontSize: T.base,
    fontWeight: '800',
  },
  label: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '600',
  },
});
