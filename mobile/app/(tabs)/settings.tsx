/**
 * settings.tsx — App settings screen
 *
 * Sections:
 *   - Storage: total docs, total disk usage, clear all data
 *   - Export: export all documents as ZIP (Phase 4)
 *   - About: version, build, licenses
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
import { C, T, R, S } from '@/theme/tokens';

const APP_VERSION = '0.3.0';
const BUILD = 'Phase 3 — Viewer · Search · Folders';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore(s => s.documents);
  const folders = useDocumentStore(s => s.folders);

  // We need direct store access to wipe state
  const storeState = useDocumentStore.getState;

  const [isClearing, setIsClearing] = useState(false);

  const totalSize = useMemo(
    () => documents.reduce((sum, d) => sum + (d.fileSizeBytes ?? 0), 0),
    [documents]
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
              // Delete all files from disk
              await Promise.all(
                documents.map(d => deleteDocumentFiles(d.id).catch(() => {}))
              );
              // Clear store
              useDocumentStore.setState({ documents: [], folders: [] });
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + S[8] },
        ]}
      >
        {/* Storage */}
        <SectionHeader title="Storage" />
        <View style={styles.card}>
          <SettingsRow
            label="Documents"
            value={`${documents.length}`}
          />
          <Divider />
          <SettingsRow
            label="Folders"
            value={`${folders.length}`}
          />
          <Divider />
          <SettingsRow
            label="Disk Usage"
            value={formatBytes(totalSize)}
          />
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.dangerRow, pressed && { opacity: 0.7 }]}
            onPress={handleClearAll}
            disabled={isClearing || documents.length === 0}
          >
            {isClearing ? (
              <ActivityIndicator color={C.danger} />
            ) : (
              <Text style={[
                styles.dangerText,
                documents.length === 0 && styles.dangerTextDisabled,
              ]}>
                Clear All Documents
              </Text>
            )}
          </Pressable>
        </View>

        {/* Export (placeholder for Phase 4) */}
        <SectionHeader title="Export" />
        <View style={styles.card}>
          <Pressable style={styles.disabledRow}>
            <Text style={styles.disabledLabel}>Export as ZIP</Text>
            <Text style={styles.comingSoonBadge}>Phase 4</Text>
          </Pressable>
          <Divider />
          <Pressable style={styles.disabledRow}>
            <Text style={styles.disabledLabel}>iCloud Backup</Text>
            <Text style={styles.comingSoonBadge}>Phase 4</Text>
          </Pressable>
        </View>

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
          PaperTrail stores all your documents privately on your device.{"\n"}
          Nothing is uploaded to any server.
        </Text>
      </ScrollView>
    </View>
  );
}

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
  header: {
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  screenTitle: { fontSize: T.xl, fontWeight: '700', color: C.cream },
  content: { padding: S[4], gap: S[2] },
  sectionHeader: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: S[4],
    marginBottom: S[1],
    marginLeft: S[2],
  },
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    marginBottom: S[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 52,
  },
  rowLabel: { flex: 1, fontSize: T.base, color: C.cream },
  rowValue: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.ink3, marginLeft: S[4] },
  dangerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[4],
    minHeight: 52,
  },
  dangerText: { fontSize: T.base, color: C.danger, fontWeight: '600' },
  dangerTextDisabled: { color: C.ink4 },
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 52,
    opacity: 0.5,
  },
  disabledLabel: { flex: 1, fontSize: T.base, color: C.ash },
  comingSoonBadge: {
    fontSize: T.xs,
    color: C.amber,
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
    fontWeight: '600',
  },
  footer: {
    fontSize: T.sm,
    color: C.ink4,
    textAlign: 'center',
    marginTop: S[6],
    lineHeight: 20,
  },
});
