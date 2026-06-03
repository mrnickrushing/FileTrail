/**
 * settings.tsx — App settings screen (Phase 7)
 *
 * Sections:
 *   - Storage: total docs, disk usage, clear all
 *   - Export: ZIP export
 *   - Backup & Restore: create local backup, restore from backup
 *   - About: version, build
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store/documentStore';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { exportAllAsZip } from '@/services/exportService';
import { createBackup, restoreBackup } from '@/services/backupService';
import { C, T, R, S } from '@/theme/tokens';

const APP_VERSION = '0.7.0';
const BUILD = 'Phase 7 — Backup & Restore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore(s => s.documents);
  const folders = useDocumentStore(s => s.folders);

  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);

  const totalSize = useMemo(
    () => documents.reduce((sum, d) => sum + (d.fileSizeBytes ?? 0), 0),
    [documents],
  );

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${documents.length} document${documents.length === 1 ? '' : 's'} and ${folders.length} folder${folders.length === 1 ? '' : 's'}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await Promise.all(
                documents.map(d => deleteDocumentFiles(d.id).catch(() => {})),
              );
              useDocumentStore.setState({ documents: [], folders: [] });
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleExportZip = async () => {
    if (documents.length === 0) {
      Alert.alert('Nothing to Export', 'Add some documents first.');
      return;
    }
    setIsExporting(true);
    setExportProgress(null);
    try {
      await exportAllAsZip(documents, ({ current, total, filename }) => {
        setExportProgress(`Packing ${current}/${total}: ${filename}`);
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message ?? 'Something went wrong.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleBackup = async () => {
    if (documents.length === 0) {
      Alert.alert('Nothing to Back Up', 'Add some documents first.');
      return;
    }
    setIsBackingUp(true);
    setBackupProgress(null);
    try {
      await createBackup(documents, folders, ({ current, total, label }) => {
        setBackupProgress(`Reading ${current}/${total}: ${label}`);
      });
    } catch (err: any) {
      Alert.alert('Backup Failed', err?.message ?? 'Something went wrong.');
    } finally {
      setIsBackingUp(false);
      setBackupProgress(null);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Backup',
      'This will add documents from the backup to your vault. Existing documents are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Backup File',
          onPress: async () => {
            setIsRestoring(true);
            setRestoreProgress('Picking file…');
            try {
              const result = await restoreBackup(({ current, total, label }) => {
                setRestoreProgress(`Restoring ${current}/${total}: ${label}`);
              });

              // Merge restored docs into store (skip duplicates by id)
              const existing = useDocumentStore.getState();
              const existingIds = new Set(existing.documents.map(d => d.id));
              const newDocs = result.documents.filter(d => !existingIds.has(d.id));
              const existingFolderIds = new Set(existing.folders.map(f => f.id));
              const newFolders = result.folders.filter(f => !existingFolderIds.has(f.id));

              useDocumentStore.setState({
                documents: [...newDocs, ...existing.documents],
                folders: [...newFolders, ...existing.folders],
              });

              Alert.alert(
                'Restore Complete',
                `Restored ${newDocs.length} document${newDocs.length === 1 ? '' : 's'}${result.skipped > 0 ? ` (${result.skipped} skipped — files missing from backup)` : ''}.`,
              );
            } catch (err: any) {
              Alert.alert('Restore Failed', err?.message ?? 'Could not read backup file.');
            } finally {
              setIsRestoring(false);
              setRestoreProgress(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + S[8] }]}
      >
        {/* Storage */}
        <SectionHeader title="Storage" />
        <View style={styles.card}>
          <SettingsRow label="Documents" value={`${documents.length}`} />
          <Divider />
          <SettingsRow label="Folders" value={`${folders.length}`} />
          <Divider />
          <SettingsRow label="Disk Usage" value={formatBytes(totalSize)} />
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.dangerRow, pressed && { opacity: 0.7 }]}
            onPress={handleClearAll}
            disabled={isClearing || documents.length === 0}
          >
            {isClearing
              ? <ActivityIndicator color={C.danger} />
              : <Text style={[styles.dangerText, documents.length === 0 && styles.dangerTextDisabled]}>
                  Clear All Documents
                </Text>
            }
          </Pressable>
        </View>

        {/* Backup & Restore */}
        <SectionHeader title="Backup & Restore" />
        <View style={styles.card}>
          <ActionRow
            label="Create Backup"
            sub={backupProgress ?? `${documents.length} doc${documents.length === 1 ? '' : 's'} · saves a .ptbak file`}
            loading={isBackingUp}
            disabled={isBackingUp || documents.length === 0}
            onPress={handleBackup}
          />
          <Divider />
          <ActionRow
            label="Restore from Backup"
            sub={restoreProgress ?? 'Choose a .ptbak file to import'}
            loading={isRestoring}
            disabled={isRestoring}
            onPress={handleRestore}
          />
        </View>
        <Text style={styles.hint}>
          Backups include all document files and metadata. Save the .ptbak file to iCloud, Google Drive, or any location you control.
        </Text>

        {/* Export */}
        <SectionHeader title="Export" />
        <View style={styles.card}>
          <ActionRow
            label="Export All as ZIP"
            sub={exportProgress ?? `${documents.length} doc${documents.length === 1 ? '' : 's'} · ${formatBytes(totalSize)}`}
            loading={isExporting}
            disabled={isExporting || documents.length === 0}
            onPress={handleExportZip}
          />
        </View>
        <Text style={styles.hint}>
          To share a single document, open it and tap ↑ in the top right.
        </Text>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingsRow label="Version" value={APP_VERSION} />
          <Divider />
          <SettingsRow label="Build" value={BUILD} />
          <Divider />
          <SettingsRow label="Storage" value="On-device only" />
        </View>

        <Text style={styles.footer}>
          PaperTrail stores all your documents privately on your device.{'\n'}
          Nothing is uploaded to any server.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Small helper components ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ActionRow({
  label, sub, loading, disabled, onPress,
}: {
  label: string; sub: string; loading: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, (pressed || disabled) && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionContent}>
        <Text style={[styles.actionLabel, disabled && !loading && styles.actionLabelDisabled]}>
          {label}
        </Text>
        <Text style={styles.actionSub} numberOfLines={1}>{sub}</Text>
      </View>
      {loading ? <ActivityIndicator color={C.amber} /> : <Text style={styles.actionChevron}>›</Text>}
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  header: { paddingHorizontal: S[4], paddingVertical: S[4], borderBottomWidth: 1, borderBottomColor: C.ink3 },
  screenTitle: { fontSize: T.xl, fontWeight: '700', color: C.cream },
  content: { padding: S[4], gap: S[2] },
  sectionHeader: {
    fontSize: T.xs, fontWeight: '600', color: C.ash,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: S[4], marginBottom: S[1], marginLeft: S[2],
  },
  card: { backgroundColor: C.ink2, borderRadius: R.lg, overflow: 'hidden', marginBottom: S[2] },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4], paddingVertical: S[4], minHeight: 52 },
  rowLabel: { flex: 1, fontSize: T.base, color: C.cream },
  rowValue: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.ink3, marginLeft: S[4] },
  dangerRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: S[4], minHeight: 52 },
  dangerText: { fontSize: T.base, color: C.danger, fontWeight: '600' },
  dangerTextDisabled: { color: C.ink4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4], paddingVertical: S[4], minHeight: 64 },
  actionContent: { flex: 1, gap: 2 },
  actionLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  actionLabelDisabled: { color: C.ash },
  actionSub: { fontSize: T.sm, color: C.ash },
  actionChevron: { fontSize: 22, color: C.ash },
  hint: { fontSize: T.xs, color: C.ink4, marginHorizontal: S[2], marginBottom: S[2], lineHeight: 18 },
  footer: { fontSize: T.sm, color: C.ink4, textAlign: 'center', marginTop: S[6], lineHeight: 20 },
});
