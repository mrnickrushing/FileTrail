import React from 'react';
import { Pressable, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, Spacing } from '@/theme';

interface Props {
  onPress: () => void;
}

export function FAB({ onPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        {
          bottom:
            (Platform.OS === 'ios' ? 90 : 72) +
            insets.bottom +
            Spacing['4'],
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityLabel="Add document"
      accessibilityRole="button"
    >
      <Text style={styles.icon}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position:        'absolute',
    right:           Spacing['5'],
    width:           56,
    height:          56,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primary,
    justifyContent:  'center',
    alignItems:      'center',
    ...Shadows.lg,
  },
  pressed: { transform: [{ scale: 0.93 }], opacity: 0.9 },
  icon: {
    fontSize:   28,
    color:      Colors.textInverse,
    lineHeight: 32,
    fontWeight: '300',
  },
});
