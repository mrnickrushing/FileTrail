import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/theme';

interface Props {
  icon: string;          // emoji or icon name placeholder
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  const iconEmoji: Record<string, string> = {
    'file-text': '📄',
    'folder':    '📁',
    'search':    '🔍',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{iconEmoji[icon] ?? '📄'}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          style={styles.action}
          onPress={onAction}
          hitSlop={8}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: Spacing['16'],
    paddingHorizontal: Spacing['8'],
    gap:            Spacing['3'],
  },
  icon:     { fontSize: 52 },
  title: {
    fontSize:   Typography.lg,
    fontWeight: Typography.semibold,
    color:      Colors.text,
    textAlign:  'center',
  },
  subtitle: {
    fontSize:   Typography.base,
    color:      Colors.textMuted,
    textAlign:  'center',
    lineHeight: Typography.base * 1.5,
    maxWidth:   280,
  },
  action: {
    marginTop:        Spacing['2'],
    paddingHorizontal: Spacing['5'],
    paddingVertical:  Spacing['3'],
    borderRadius:     Radius.full,
    backgroundColor:  Colors.primary,
    minHeight:        44,
    justifyContent:   'center',
  },
  actionText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textInverse,
  },
});
