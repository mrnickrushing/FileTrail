/**
 * SyncStatusButton.tsx — floating sync status indicator (#2).
 *
 * Sits just above the FAB and surfaces sync state the user would otherwise
 * never see: it appears only when there's something worth showing — a sync in
 * progress, an error, pending uploads, or a stale last-sync — and stays hidden
 * when everything is quietly up to date. Tapping it opens the sync overlay.
 *
 * Only rendered for accounts that actually have cloud sync enabled (a storage
 * user id + token); for everyone else this returns null.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
  useReducedMotion,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useAppStore, useDocumentStore } from '@/store';
import { getPendingSyncCount, isSyncStale } from '@/lib/vault';
import { C, R, S, Shadows } from '@/theme/tokens';

// Keep in sync with FAB.tsx positioning so we stack neatly above it.
const TAB_BAR_HEIGHT = 62;
const TAB_BAR_GAP = 8;
const FAB_SIZE = 56;
const SIZE = 48;

interface Props {
  onPress: () => void;
}

export function SyncStatusButton({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const accountProfile = useAppStore((s) => s.accountProfile);
  const documents = useDocumentStore((s) => s.documents);
  const deletedDocumentIds = useDocumentStore((s) => s.deletedDocumentIds);
  const deletedFolderIds = useDocumentStore((s) => s.deletedFolderIds);
  const syncState = useDocumentStore((s) => s.syncState);

  const syncEnabled = Boolean(accountProfile?.userId && accountProfile?.storageAccessToken);
  const phase = syncState.phase;
  const pending = getPendingSyncCount(documents, deletedDocumentIds, deletedFolderIds);
  const stale = isSyncStale(syncState.lastSuccessfulSyncAt);

  // Show a brief success state after a sync completes, then let the button hide.
  const [justSucceeded, setJustSucceeded] = useState(false);
  useEffect(() => {
    if (phase !== 'success') return;
    setJustSucceeded(true);
    const t = setTimeout(() => setJustSucceeded(false), 1800);
    return () => clearTimeout(t);
  }, [phase, syncState.lastSuccessfulSyncAt]);

  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);
  const press = useSharedValue(1);

  useEffect(() => {
    if (phase === 'syncing' && !reducedMotion) {
      spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
      pulse.value = withRepeat(withTiming(1.08, { duration: 700 }), -1, true);
    } else {
      cancelAnimation(spin);
      cancelAnimation(pulse);
      spin.value = 0;
      pulse.value = 1;
    }
  }, [phase, reducedMotion, spin, pulse]);

  // Celebratory pop when a sync just succeeded.
  useEffect(() => {
    if (justSucceeded && !reducedMotion) {
      pulse.value = withSequence(withSpring(1.18, { damping: 6 }), withSpring(1, { damping: 10 }));
    }
  }, [justSucceeded, reducedMotion, pulse]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value * press.value }] }));

  if (!syncEnabled) return null;

  const visible =
    phase === 'syncing' || phase === 'error' || justSucceeded || pending > 0 || stale;
  if (!visible) return null;

  let icon: React.ComponentProps<typeof Feather>['name'] = 'upload-cloud';
  let tint: string = C.amber;
  const bg = C.ink2;
  let border = C.amber + '55';
  if (phase === 'syncing') {
    icon = 'refresh-cw';
  } else if (phase === 'error') {
    icon = 'alert-circle';
    tint = C.danger;
    border = C.danger + '66';
  } else if (justSucceeded) {
    icon = 'check';
    tint = C.success;
    border = C.success + '66';
  }

  const showBadge = pending > 0 && phase !== 'syncing' && phase !== 'error';
  const bottom = Math.max(insets.bottom, 8) + TAB_BAR_GAP + TAB_BAR_HEIGHT + S[3] + FAB_SIZE + S[3];

  const label =
    phase === 'syncing'
      ? 'Syncing'
      : phase === 'error'
        ? 'Sync failed, tap to retry'
        : justSucceeded
          ? 'Synced'
          : `${pending} item${pending === 1 ? '' : 's'} waiting to sync`;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.wrap, { bottom }, containerStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(0.9, { damping: 14 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 12 });
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.button,
          { backgroundColor: bg, borderColor: border },
          phase === 'syncing' && Shadows.glow,
        ]}
      >
        <Animated.View style={phase === 'syncing' ? iconStyle : undefined}>
          <Feather name={icon} size={22} color={tint} />
        </Animated.View>
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending > 99 ? '99+' : pending}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: S[5] + 4, // centers a 48px button under the 56px FAB
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: R.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: R.full,
    backgroundColor: C.amber,
    borderWidth: 2,
    borderColor: C.ink1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.ink1,
  },
});
