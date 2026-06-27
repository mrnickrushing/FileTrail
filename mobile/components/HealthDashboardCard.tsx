/**
 * HealthDashboardCard.tsx — prominent "Document Health" hero card (#4).
 *
 * Replaces the small buried health ring in the vault header with a full-width
 * card: a larger ring whose stroke animates in on mount, plus a 2×2 breakdown
 * of the four critical categories. Tapping a category jumps the vault filter to
 * it so a missing one is one tap from being addressed.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { C, T, R, S } from '@/theme/tokens';
import type { Document, DocumentCategory } from '@/types/document';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CRITICAL: { key: DocumentCategory; label: string }[] = [
  { key: 'id', label: 'ID / Passport' },
  { key: 'medical', label: 'Medical' },
  { key: 'tax', label: 'Tax' },
  { key: 'warranty', label: 'Warranties' },
];

const RING = 84;
const STROKE = 8;
const CENTER = RING / 2;
const RADIUS = CENTER - STROKE / 2;
const CIRC = 2 * Math.PI * RADIUS;

interface Props {
  documents: Document[];
  onSelectCategory: (category: DocumentCategory) => void;
}

export function HealthDashboardCard({ documents, onSelectCategory }: Props) {
  const reducedMotion = useReducedMotion();

  const present = useMemo(() => new Set(documents.map((d) => d.category)), [documents]);
  const presentCount = CRITICAL.reduce((n, c) => (present.has(c.key) ? n + 1 : n), 0);
  const score = Math.round((presentCount / CRITICAL.length) * 100);
  const color = score >= 75 ? C.success : score >= 50 ? C.warning : C.danger;

  const progress = useSharedValue(0);
  useEffect(() => {
    const target = score / 100;
    progress.value = reducedMotion
      ? target
      : withDelay(120, withTiming(target, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [score, reducedMotion, progress]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Vault</Text>
        <Text style={styles.subtitle}>
          {documents.length} document{documents.length === 1 ? '' : 's'} stored
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.ringWrap}>
          <Svg width={RING} height={RING}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={C.ink4} strokeWidth={STROKE} fill="none" />
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={color}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRC}
              animatedProps={ringProps}
              strokeLinecap="round"
              rotation={-90}
              originX={CENTER}
              originY={CENTER}
            />
          </Svg>
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={[styles.scoreText, { color }]}>{score}</Text>
            <Text style={styles.scoreUnit}>%</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {CRITICAL.map((cat) => {
            const has = present.has(cat.key);
            return (
              <Pressable
                key={cat.key}
                style={({ pressed }) => [styles.quad, pressed && styles.quadPressed]}
                onPress={() => onSelectCategory(cat.key)}
                accessibilityRole="button"
                accessibilityLabel={`${cat.label}: ${has ? 'covered' : 'missing'}. Tap to view.`}
              >
                <Feather
                  name={has ? 'check-circle' : 'plus-circle'}
                  size={15}
                  color={has ? C.success : C.faint}
                />
                <Text style={[styles.quadLabel, { color: has ? C.cream : C.ash }]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.footnote}>
        {score === 100
          ? 'Every critical category is covered.'
          : 'Tap a category to add the documents you’re missing.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    borderRadius: R.xl,
    padding: S[4],
    gap: S[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: T.xl,
    color: C.cream,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: T.sm,
    color: C.ash,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[4],
  },
  ringWrap: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 26,
    fontWeight: '800',
  },
  scoreUnit: {
    fontSize: T.xs,
    fontWeight: '700',
    color: C.ash,
    marginLeft: 1,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  quad: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: S[2],
    paddingHorizontal: S[2],
    borderRadius: R.md,
    backgroundColor: C.ink1 + '66',
  },
  quadPressed: {
    opacity: 0.65,
  },
  quadLabel: {
    flex: 1,
    fontSize: T.xs,
    fontWeight: '600',
  },
  footnote: {
    fontSize: T.xs,
    color: C.faint,
  },
});
