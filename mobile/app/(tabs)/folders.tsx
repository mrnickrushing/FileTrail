import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  Pressable, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/theme';
import { DocumentFolder } from '@/types';

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function FoldersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { folders, addFolder, removeFolder } = useDocumentStore();
  const [showModal, setShowModal] = useState(false);
  const [folderName, setFolderName] = useState('');

  const handleCreate = async () => {
    const name = folderName.trim();
    if (!name) return;
    const now = Date.now();
    const folder: DocumentFolder = {
      id: genId(), name, createdAt: now, updatedAt: now,
    };
    await addFolder(folder);
    setFolderName('');
    setShowModal(false);
  };

  const handleDelete = (folder: DocumentFolder) => {
    Alert.alert(
      'Delete Folder',
      `Delete "${folder.name}"? Documents inside will move to root.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeFolder(folder.id) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing['4'] }]}>
        <Text style={styles.title}>Folders</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => setShowModal(true)}
          hitSlop={8}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={[
          styles.list,
          folders.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.folderRow, pressed && styles.pressed]}
            onPress={() => router.push(`/folder/${item.id}`)}
            onLongPress={() => handleDelete(item)}
          >
            <Text style={styles.folderIcon}>📁</Text>
            <View style={styles.folderMeta}>
              <Text style={styles.folderName}>{item.name}</Text>
              <Text style={styles.folderHint}>Hold to delete</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder"
            title="No folders yet"
            subtitle="Organize your documents into folders for quick access"
            actionLabel="Create folder"
            onAction={() => setShowModal(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* New Folder Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowModal(false)}
        >
          <Pressable style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TextInput
              style={styles.input}
              placeholder="Folder name"
              placeholderTextColor={Colors.textFaint}
              value={folderName}
              onChangeText={setFolderName}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowModal(false); setFolderName(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCreate,
                  !folderName.trim() && styles.modalBtnDisabled]}
                onPress={handleCreate}
                disabled={!folderName.trim()}
              >
                <Text style={styles.modalBtnCreateText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection:    'row',
    alignItems:       'flex-end',
    justifyContent:   'space-between',
    paddingHorizontal: Spacing['6'],
    paddingBottom:    Spacing['4'],
  },
  title: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.text,
    letterSpacing: -0.5,
  },
  newBtn: {
    paddingHorizontal: Spacing['4'],
    paddingVertical:   Spacing['2'],
    borderRadius:      Radius.full,
    backgroundColor:   Colors.primary,
    minHeight:         36,
    justifyContent:    'center',
  },
  newBtnText:  { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textInverse },
  list:        { paddingHorizontal: Spacing['4'], paddingBottom: 40 },
  listEmpty:   { flex: 1, justifyContent: 'center' },
  folderRow: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.surface,
    borderRadius:   Radius.lg,
    padding:        Spacing['4'],
    marginBottom:   Spacing['3'],
    gap:            Spacing['3'],
    ...Shadows.sm,
  },
  pressed:     { opacity: 0.75 },
  folderIcon:  { fontSize: 28 },
  folderMeta:  { flex: 1 },
  folderName:  { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text },
  folderHint:  { fontSize: Typography.xs, color: Colors.textFaint, marginTop: 2 },
  chevron:     { fontSize: Typography.xl, color: Colors.textFaint },
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         Spacing['6'],
  },
  modalBox: {
    width:           '100%',
    backgroundColor: Colors.surface2,
    borderRadius:    Radius.xl,
    padding:         Spacing['6'],
    gap:             Spacing['4'],
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.text,
  },
  input: {
    backgroundColor:  Colors.surfaceOffset,
    borderRadius:     Radius.md,
    paddingHorizontal: Spacing['4'],
    paddingVertical:  Spacing['3'],
    fontSize:         Typography.base,
    color:            Colors.text,
    borderWidth:      1,
    borderColor:      Colors.border,
    minHeight:        48,
  },
  modalActions:       { flexDirection: 'row', gap: Spacing['3'] },
  modalBtn: {
    flex:           1,
    paddingVertical: Spacing['3'],
    borderRadius:   Radius.md,
    alignItems:     'center',
    minHeight:      48,
    justifyContent: 'center',
  },
  modalBtnCancel:     { backgroundColor: Colors.surfaceDynamic },
  modalBtnCreate:     { backgroundColor: Colors.primary },
  modalBtnDisabled:   { opacity: 0.4 },
  modalBtnCancelText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textMuted },
  modalBtnCreateText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },
});
