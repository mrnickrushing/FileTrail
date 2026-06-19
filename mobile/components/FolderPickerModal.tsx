import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Layout,
  FadeIn,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';
import { C, T, S, R } from '@/theme/tokens';
import type { Folder } from '@/types/document';

type FolderOption = Pick<Folder, 'name' | 'color'> & {
  id: string | null;
  depth: number;
  hasChildren: boolean;
};

interface FolderPickerModalProps {
  visible: boolean;
  folders: Folder[];
  onSelect: (folderId: string | null) => void;
  onCancel: () => void;
}

/** Builds the parent list plus a lookup of children per parent, for a collapsible tree. */
function buildTree(folders: Folder[]): { parents: FolderOption[]; childrenByParent: Map<string, FolderOption[]> } {
  const parentFolders = folders.filter((f) => !f.parentId);
  const childrenByParent = new Map<string, FolderOption[]>();
  for (const parent of parentFolders) {
    const children = folders
      .filter((f) => f.parentId === parent.id)
      .map((c) => ({ id: c.id, name: c.name, color: c.color, depth: 1, hasChildren: false }));
    childrenByParent.set(parent.id, children);
  }
  const parents = parentFolders.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    depth: 0,
    hasChildren: (childrenByParent.get(p.id)?.length ?? 0) > 0,
  }));
  return { parents, childrenByParent };
}

export function FolderPickerModal({
  visible,
  folders,
  onSelect,
  onCancel,
}: FolderPickerModalProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!visible) return null;

  const { parents, childrenByParent } = buildTree(folders);

  const data: FolderOption[] = [{ id: null, name: 'Unfiled', color: '#6B7280', depth: 0, hasChildren: false }];
  for (const parent of parents) {
    data.push(parent);
    if (parent.hasChildren && !collapsed.has(parent.id!)) {
      data.push(...(childrenByParent.get(parent.id!) ?? []));
    }
  }

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
            <Animated.View
              layout={reducedMotion ? undefined : Layout.springify().damping(18)}
              entering={reducedMotion || item.depth === 0 ? undefined : FadeIn.duration(140)}
              exiting={reducedMotion || item.depth === 0 ? undefined : FadeOut.duration(100)}
            >
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed, item.depth > 0 && styles.rowChild]}
                onPress={() => onSelect(item.id)}
              >
                {item.depth > 0 && <Text style={styles.childMark}>›</Text>}
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
                {item.hasChildren && (
                  <Pressable
                    hitSlop={10}
                    style={styles.chevronBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(item.id!);
                    }}
                  >
                    <Feather
                      name={collapsed.has(item.id!) ? 'chevron-right' : 'chevron-down'}
                      size={16}
                      color={C.ash}
                    />
                  </Pressable>
                )}
              </Pressable>
            </Animated.View>
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
    flex: 1,
    fontSize: T.base,
    color: C.cream,
    fontWeight: '500',
  },
  chevronBtn: {
    padding: S[1],
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
