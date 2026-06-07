import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, S, R } from '@/theme/tokens';
import type { Folder } from '@/types/document';

type FolderOption = Pick<Folder, 'name' | 'color'> & { id: string | null; depth: number };

interface FolderPickerModalProps {
  visible: boolean;
  folders: Folder[];
  onSelect: (folderId: string | null) => void;
  onCancel: () => void;
}

/** Flattens folders into parent → child order, tagging each with its nesting depth for indentation. */
function buildHierarchy(folders: Folder[]): FolderOption[] {
  const parents = folders.filter((f) => !f.parentId);
  const result: FolderOption[] = [];
  for (const parent of parents) {
    result.push({ id: parent.id, name: parent.name, color: parent.color, depth: 0 });
    const children = folders.filter((f) => f.parentId === parent.id);
    for (const child of children) {
      result.push({ id: child.id, name: child.name, color: child.color, depth: 1 });
    }
  }
  return result;
}

export function FolderPickerModal({
  visible,
  folders,
  onSelect,
  onCancel,
}: FolderPickerModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const data: FolderOption[] = [
    { id: null, name: 'Unfiled', color: '#6B7280', depth: 0 },
    ...buildHierarchy(folders),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S[4] }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Move to Folder</Text>

        <FlatList<FolderOption>
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed, item.depth > 0 && styles.rowChild]}
              onPress={() => onSelect(item.id)}
            >
              {item.depth > 0 && <Text style={styles.childMark}>›</Text>}
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />

        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[5],
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.cream,
    marginBottom: S[3],
  },
  list: {
    paddingBottom: S[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S[4],
    gap: S[3],
  },
  rowChild: {
    paddingLeft: S[6],
  },
  rowPressed: {
    opacity: 0.6,
  },
  childMark: {
    fontSize: T.base,
    color: C.ash,
    marginRight: -S[1],
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: R.full,
  },
  folderName: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '500',
  },
  sep: {
    height: 1,
    backgroundColor: C.ink3,
  },
  cancelBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    marginTop: S[2],
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
});
