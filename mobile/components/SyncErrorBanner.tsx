/**
 * SyncErrorBanner.tsx — sync failure banner with recovery (#3).
 *
 * When a sync fails the error was previously silent. This surfaces it at the top
 * of the vault with a plain-language reason, a manual Retry, and an automatic
 * retry on an exponential backoff (5s → 15s → 60s, then steady). It self-hides
 * the moment a sync starts or succeeds, and only renders for sync-enabled
 * accounts.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useAppStore, useDocumentStore } from '@/store';
import { describeSyncError } from '@/lib/vault';
import { C, T, R, S } from '@/theme/tokens';

const BACKOFF_SECONDS = [5, 15, 60];

export function SyncErrorBanner() {
  const accountProfile = useAppStore((s) => s.accountProfile);
  const syncState = useDocumentStore((s) => s.syncState);
  const syncWithBackend = useDocumentStore((s) => s.syncWithBackend);

  const syncEnabled = Boolean(accountProfile?.userId && accountProfile?.storageAccessToken);
  const phase = syncState.phase;
  const isError = phase === 'error';

  const attemptRef = useRef(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const triggerRetry = useCallback(() => {
    setCountdown(null);
    void syncWithBackend({ repairStorage: true }).catch(() => undefined);
  }, [syncWithBackend]);

  // Reset the backoff ladder only once a sync actually succeeds (or goes idle).
  // Crucially NOT on the 'syncing' transition — otherwise every retry would
  // restart at 5s and the 5s→15s→60s escalation would never happen.
  useEffect(() => {
    if (phase === 'success' || phase === 'idle') {
      attemptRef.current = 0;
    }
  }, [phase]);

  // Arm a countdown for each fresh error (keyed on the attempt timestamp so a
  // new failure restarts the timer at the next backoff rung); clear it while a
  // sync is in flight.
  useEffect(() => {
    if (!isError) {
      setCountdown(null);
      return;
    }
    if (!syncEnabled) return;
    const seconds = BACKOFF_SECONDS[Math.min(attemptRef.current, BACKOFF_SECONDS.length - 1)];
    setCountdown(seconds);
  }, [isError, syncEnabled, phase, syncState.lastAttemptedSyncAt]);

  // Tick the countdown; fire a retry at zero.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      attemptRef.current += 1;
      triggerRetry();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, triggerRetry]);

  if (!syncEnabled || !isError) return null;

  const reason = describeSyncError(syncState.lastError);

  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(150)} style={styles.banner}>
      <View style={styles.iconWrap}>
        <Feather name="cloud-off" size={16} color={C.danger} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{reason}</Text>
        <Text style={styles.detail}>
          {countdown && countdown > 0 ? `Retrying in ${countdown}s…` : 'Retrying…'}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          attemptRef.current += 1;
          triggerRetry();
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Retry sync now"
      >
        <Feather name="rotate-cw" size={13} color={C.danger} />
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    marginHorizontal: S[4],
    marginBottom: S[2],
    backgroundColor: C.danger + '14',
    borderWidth: 1,
    borderColor: C.danger + '40',
    borderRadius: R.lg,
    paddingHorizontal: S[3],
    paddingVertical: S[3],
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: R.md,
    backgroundColor: C.danger + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.danger,
  },
  detail: {
    fontSize: T.xs,
    color: C.ash,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: R.md,
    backgroundColor: C.danger + '1F',
  },
  retryBtnPressed: {
    opacity: 0.7,
  },
  retryText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.danger,
  },
});
