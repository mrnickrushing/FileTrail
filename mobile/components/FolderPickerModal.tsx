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

/** Groups folders by parent id (any nesting depth) for a collapsible tree. */
function buildTree(folders: Folder[]): Map<string | null, FolderOption[]> {
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }

  const optionsByParent = new Map<string | null, FolderOption[]>();
  function visit(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    optionsByParent.set(
      parentId,
      children.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        depth,
        hasChildren: (byParent.get(c.id)?.length ?? 0) > 0,
      })),
    );
    for (const c of children) visit(c.id, depth + 1);
  }
  visit(null, 0);
  return optionsByParent;
}

/** Flattens the tree depth-first, skipping descendants of collapsed nodes. */
function flattenVisible(
  parentId: string | null,
  optionsByParent: Map<string | null, FolderOption[]>,
  collapsed: Set<string>,
): FolderOption[] {
  const result: FolderOption[] = [];
  for (const item of optionsByParent.get(parentId) ?? []) {
    result.push(item);
    if (item.hasChildren && !collapsed.has(item.id!)) {
      result.push(...flattenVisible(item.id, optionsByParent, collapsed));
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
  const reducedMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!visible) return null;

  const optionsByParent = buildTree(folders);

  const data: FolderOption[] = [
    { id: null, name: 'Unfiled', color: '#6B7280', depth: 0, hasChildren: false },
    ...flattenVisible(null, optionsByParent, collapsed),
  ];

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
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                  item.depth > 0 && { paddingLeft: S[6] * item.depth },
                ]}
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
