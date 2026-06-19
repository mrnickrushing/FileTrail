import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  ZoomIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { C, T, S, R } from '@/theme/tokens';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Show a downward arrow hinting at the FAB */
  showFABHint?: boolean;
}

const ICON_MAP: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'file-text': 'file-text',
  'folder': 'folder',
  'search': 'search',
  'inbox': 'inbox',
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, showFABHint }: Props) {
  const reducedMotion = useReducedMotion();

  // FAB hint arrow — gentle bounce every ~2s to draw the eye downward.
  const arrowY = useSharedValue(0);
  useEffect(() => {
    if (!showFABHint || reducedMotion) return;
    arrowY.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 500 }),
        withTiming(0, { duration: 500 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(arrowY);
  }, [showFABHint, reducedMotion, arrowY]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: arrowY.value }] }));

  return (
    <View style={styles.container}>
      <View style={styles.glowOuter}>
        <View style={styles.glowInner}>
          <Animated.View
            entering={reducedMotion ? undefined : ZoomIn.springify().damping(13)}
            style={styles.iconWrap}
          >
            <Feather name={ICON_MAP[icon] ?? 'file'} size={42} color={C.amber} />
          </Animated.View>
        </View>
      </View>
      <Animated.Text
        entering={reducedMotion ? undefined : FadeInUp.duration(240).delay(80)}
        style={styles.title}
      >
        {title}
      </Animated.Text>
      {subtitle ? (
        <Animated.Text
          entering={reducedMotion ? undefined : FadeInUp.duration(240).delay(160)}
          style={styles.subtitle}
        >
          {subtitle}
        </Animated.Text>
      ) : null}
      {actionLabel && onAction ? (
        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(240).delay(240)}>
          <Pressable style={styles.action} onPress={onAction} hitSlop={8}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      {showFABHint && (
        <View style={styles.fabHint}>
          <Animated.Text style={[styles.fabHintArrow, arrowStyle]}>↓</Animated.Text>
          <Text style={styles.fabHintText}>Tap + to add your first document</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[16],
    paddingHorizontal: S[8],
    gap: S[3],
  },
  // Soft amber-to-transparent glow behind the icon, approximated with two
  // concentric tinted circles (no gradient lib in this project).
  glowOuter: {
    width: 140,
    height: 140,
    borderRadius: R.full,
    backgroundColor: C.amber + '0F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[2],
  },
  glowInner: {
    width: 110,
    height: 110,
    borderRadius: R.full,
    backgroundColor: C.amber + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: R.xl,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: T.lg,
    fontWeight: '600',
    color: C.cream,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: T.base * 1.5,
    maxWidth: 280,
  },
  action: {
    marginTop: S[2],
    paddingHorizontal: S[5],
    paddingVertical: S[3],
    borderRadius: R.full,
    backgroundColor: C.amber,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.ink1,
  },
  fabHint: {
    marginTop: S[4],
    alignItems: 'center',
    gap: S[1],
  },
  fabHintArrow: {
    fontSize: 20,
    color: C.amber,
    fontWeight: '700',
  },
  fabHintText: {
    fontSize: T.sm,
    color: C.ash,
  },
});
