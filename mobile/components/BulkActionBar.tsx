import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, S, R } from '@/theme/tokens';

interface BulkActionBarProps {
  count: number;
  onMove: () => void;
  onTag: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionBar({ count, onMove, onTag, onDelete, onCancel }: BulkActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + S[3] }]}>
      <View style={styles.countRow}>
        <Text style={styles.countText}>{count} selected</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <ActionButton label="Move" emoji="📁" onPress={onMove} />
        <ActionButton label="Tag" emoji="🏷️" onPress={onTag} />
        <ActionButton label="Delete" emoji="🗑️" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function ActionButton({
  label,
  emoji,
  onPress,
  danger = false,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, danger && styles.btnDanger, pressed && styles.btnPressed]}
      onPress={onPress}
    >
      <Text style={styles.btnEmoji}>{emoji}</Text>
      <Text style={[styles.btnLabel, danger && styles.btnLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.ink2,
    borderTopWidth: 1,
    borderTopColor: C.ink3,
    paddingTop: S[3],
    paddingHorizontal: S[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S[3],
  },
  countText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
  },
  actions: {
    flexDirection: 'row',
    gap: S[3],
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    paddingVertical: S[3],
    minHeight: 60,
  },
  btnDanger: {
    backgroundColor: '#3A1515',
  },
  btnPressed: {
    opacity: 0.65,
  },
  btnEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  btnLabel: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.ash,
  },
  btnLabelDanger: {
    color: '#EF4444',
  },
});
