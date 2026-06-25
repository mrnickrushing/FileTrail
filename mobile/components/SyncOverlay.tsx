/**
 * SyncOverlay.tsx — rich sync progress sheet (#1).
 *
 * Replaces the old "freezes with no feedback" experience with a slide-up sheet
 * showing an animated status ring, the current sync state, how many items are
 * waiting, when we last synced, and clear actions to sync now / retry.
 *
 * Honest about the data we have: the sync layer does NOT report per-document
 * upload bytes, so the ring is an indeterminate spinner while syncing (not a
 * fake percentage), completing to a full ring on success and turning red with a
 * shake on error. Auto-collapses shortly after a successful sync so it never
 * blocks the UI.
 */

import React, { useEffect } from 'react';
import { Modal, Pressable, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  useReducedMotion,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useAppStore, useDocumentStore } from '@/store';
import {
  getPendingSyncCount,
  formatRelativeTime,
  describeSyncError,
} from '@/lib/vault';
import { C, T, R, S, Shadows } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 132;
const STROKE = 10;
const CENTER = RING_SIZE / 2;
const RADIUS = CENTER - STROKE / 2;
const CIRC = 2 * Math.PI * RADIUS;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SyncOverlay({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const accountProfile = useAppStore((s) => s.accountProfile);
  const documents = useDocumentStore((s) => s.documents);
  const deletedDocumentIds = useDocumentStore((s) => s.deletedDocumentIds);
  const deletedFolderIds = useDocumentStore((s) => s.deletedFolderIds);
  const syncState = useDocumentStore((s) => s.syncState);
  const syncWithBackend = useDocumentStore((s) => s.syncWithBackend);

  const phase = syncState.phase;
  const pending = getPendingSyncCount(documents, deletedDocumentIds, deletedFolderIds);

  const spin = useSharedValue(0);
  const shake = useSharedValue(0);
  const progress = useSharedValue(0); // 0..1 fraction of the ring filled

  // Drive the ring per phase.
  useEffect(() => {
    if (!visible) return;
    cancelAnimation(spin);
    if (phase === 'syncing') {
      progress.value = 0.25; // indeterminate arc length
      spin.value = reducedMotion
        ? 0
        : withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
    } else if (phase === 'success') {
      spin.value = 0;
      progress.value = reducedMotion ? 1 : withTiming(1, { duration: 500 });
    } else if (phase === 'error') {
      spin.value = 0;
      progress.value = 1;
      if (!reducedMotion) {
        shake.value = withSequence(
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        );
      }
    } else {
      // idle: a calm partial ring
      spin.value = 0;
      progress.value = pending > 0 ? 0.6 : 1;
    }
  }, [phase, visible, reducedMotion, pending, spin, shake, progress]);

  // Auto-collapse shortly after a successful sync.
  useEffect(() => {
    if (!visible || phase !== 'success') return;
    const t = setTimeout(onClose, 1400);
    return () => clearTimeout(t);
  }, [visible, phase, onClose]);

  const ringRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  const ringColor = phase === 'error' ? C.danger : phase === 'success' ? C.success : C.amber;

  const { title, detail } = describeState(
    phase,
    pending,
    syncState.lastSuccessfulSyncAt,
    syncState.lastError,
  );

  const handleSyncNow = () => {
    if (phase === 'syncing') return;
    void syncWithBackend({ repairStorage: true }).catch(() => undefined);
  };

  const syncEnabled = Boolean(accountProfile?.userId && accountProfile?.storageAccessToken);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={[styles.sheet, { paddingBottom: insets.bottom + S[6] }]}
        >
          <View style={styles.handle} />

          <Animated.View style={[styles.ringWrap, shakeStyle]}>
            <Animated.View style={[styles.ringRotate, phase === 'syncing' && ringRotation]}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={C.ink4} strokeWidth={STROKE} fill="none" />
                <AnimatedCircle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  stroke={ringColor}
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
            </Animated.View>
            <View style={styles.ringCenter} pointerEvents="none">
              {phase === 'syncing' ? (
                <ActivityIndicator color={C.amber} />
              ) : (
                <Feather
                  name={phase === 'error' ? 'alert-triangle' : phase === 'success' ? 'check' : 'cloud'}
                  size={36}
                  color={ringColor}
                />
              )}
            </View>
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>

          {pending > 0 && phase !== 'success' && (
            <View style={styles.pendingRow}>
              <Feather name="upload-cloud" size={14} color={C.amber} />
              <Text style={styles.pendingText}>
                {pending} item{pending === 1 ? '' : 's'} not yet uploaded
              </Text>
            </View>
          )}

          {syncEnabled ? (
            <>
              <Pressable
                onPress={handleSyncNow}
                disabled={phase === 'syncing'}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  phase === 'error' && styles.primaryBtnDanger,
                  (pressed || phase === 'syncing') && styles.btnPressed,
                ]}
                accessibilityRole="button"
              >
                <Feather
                  name={phase === 'error' ? 'rotate-cw' : 'refresh-cw'}
                  size={16}
                  color={C.ink1}
                />
                <Text style={styles.primaryBtnText}>
                  {phase === 'syncing' ? 'Syncing…' : phase === 'error' ? 'Retry sync' : 'Sync now'}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.secondaryBtn} accessibilityRole="button">
                <Text style={styles.secondaryBtnText}>Close</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={onClose} style={styles.primaryBtn} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function describeState(
  phase: string,
  pending: number,
  lastSuccessfulSyncAt: string | null,
  lastError: string | null,
): { title: string; detail: string } {
  switch (phase) {
    case 'syncing':
      return { title: 'Syncing your vault…', detail: 'Backing your documents up to the cloud.' };
    case 'success':
      return { title: 'All synced', detail: `Last synced ${formatRelativeTime(lastSuccessfulSyncAt)}.` };
    case 'error':
      return {
        title: describeSyncError(lastError),
        detail: lastError ? lastError : 'Something interrupted the sync. Tap retry to try again.',
      };
    default:
      return pending > 0
        ? { title: `${pending} item${pending === 1 ? '' : 's'} waiting`, detail: `Last synced ${formatRelativeTime(lastSuccessfulSyncAt)}.` }
        : { title: 'Up to date', detail: `Last synced ${formatRelativeTime(lastSuccessfulSyncAt)}.` };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingHorizontal: S[6],
    paddingTop: S[3],
    alignItems: 'center',
    ...Shadows.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    marginBottom: S[5],
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[5],
  },
  ringRotate: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: T.xl,
    fontWeight: '800',
    color: C.cream,
    textAlign: 'center',
    marginBottom: S[2],
  },
  detail: {
    fontSize: T.sm,
    color: C.ash,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: S[4],
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    marginBottom: S[5],
  },
  pendingText: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    alignSelf: 'stretch',
    backgroundColor: C.amber,
    borderRadius: R.md,
    paddingVertical: S[4],
  },
  primaryBtnDanger: {
    backgroundColor: C.danger,
  },
  primaryBtnText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.ink1,
  },
  btnPressed: {
    opacity: 0.8,
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: S[3],
    marginTop: S[2],
  },
  secondaryBtnText: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.ash,
  },
});
