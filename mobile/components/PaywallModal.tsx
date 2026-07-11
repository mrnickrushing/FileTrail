/**
 * PaywallModal.tsx — Full-screen Pro paywall modal
 *
 * Shows FileTrail Pro features and an "Unlock Pro" CTA.
 * Calls purchasePro() on confirm and restorePurchases() on restore.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { purchasePro, restorePurchases } from '@/services/purchases';
import { PRO_PRICE_DISPLAY } from '@/store';
import { C, T, R, S, Springs } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRO_FEATURES = [
  { icon: '∞', label: 'Unlimited Documents' },
  { icon: '✦', label: 'AI Auto-fill' },
  { icon: '📁', label: 'Folders' },
  { icon: '🔔', label: 'Expiry Alerts' },
];

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function billingAlertTitle(code: string): string {
  switch (code) {
    case 'not_configured':
      return 'Purchases Disabled';
    case 'not_available':
      return 'Purchase Unavailable';
    case 'not_entitled':
      return 'Purchase Incomplete';
    case 'not_found':
      return 'No Purchase Found';
    case 'unsupported_platform':
      return 'Unavailable Here';
    case 'restore_failed':
      return 'Restore Failed';
    default:
      return 'Purchase Failed';
  }
}

export function PaywallModal({ visible, onClose, onSuccess }: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const unlockPulse = useSharedValue(1);
  const unlockPress = useSharedValue(1);
  useEffect(() => {
    if (!visible || reducedMotion) return;
    unlockPulse.value = withRepeat(
      withSequence(withTiming(1.035, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    );
    return () => cancelAnimation(unlockPulse);
  }, [visible, reducedMotion, unlockPulse]);
  const unlockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: unlockPulse.value * unlockPress.value }],
  }));

  if (!visible) return null;

  const handleUnlock = async () => {
    setIsPurchasing(true);
    try {
      const result = await purchasePro();
      if (result.ok) {
        onSuccess();
        return;
      }

      if (result.code !== 'cancelled') {
        Alert.alert(billingAlertTitle(result.code), result.message);
      }
    } finally {
      if (isMounted.current) setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.ok) {
        onSuccess();
        return;
      }

      Alert.alert(billingAlertTitle(result.code), result.message);
    } finally {
      if (isMounted.current) setIsRestoring(false);
    }
  };

  const isLoading = isPurchasing || isRestoring;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Dismiss button */}
        <Pressable
          style={styles.dismissBtn}
          onPress={onClose}
          disabled={isLoading}
          hitSlop={8}
        >
          <Text style={styles.dismissText}>Maybe Later</Text>
        </Pressable>

        {/* Content */}
        <View style={styles.body}>
          {/* Icon + heading */}
          <Animated.Text
            entering={reducedMotion ? undefined : ZoomIn.springify().damping(12).delay(60)}
            style={styles.sparkle}
          >
            ✦
          </Animated.Text>
          <Animated.Text
            entering={reducedMotion ? undefined : FadeInUp.duration(260).delay(120)}
            style={styles.heading}
          >
            FileTrail Pro
          </Animated.Text>
          <Animated.Text
            entering={reducedMotion ? undefined : FadeInUp.duration(260).delay(180)}
            style={styles.subheading}
          >
            Unlock the full power of your document vault.
          </Animated.Text>

          {/* Feature list */}
          <View style={styles.featureList}>
            {PRO_FEATURES.map(({ icon, label }, i) => (
              <Animated.View
                key={label}
                entering={reducedMotion ? undefined : FadeInDown.duration(260).delay(240 + i * 70)}
                style={styles.featureRow}
              >
                <Text style={styles.featureIcon}>{icon}</Text>
                <Text style={styles.featureLabel}>{label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <AnimatedPressable
            style={[styles.unlockBtn, isLoading && styles.unlockBtnDisabled, unlockStyle]}
            onPressIn={() => { unlockPress.value = reducedMotion ? 1 : withSpring(0.96, Springs.snappy); }}
            onPressOut={() => { unlockPress.value = reducedMotion ? 1 : withSpring(1, Springs.snappy); }}
            onPress={handleUnlock}
            disabled={isLoading}
          >
            {isPurchasing ? (
              <ActivityIndicator color={C.ink1} />
            ) : (
              <Text style={styles.unlockBtnText}>Unlock Pro — {PRO_PRICE_DISPLAY}</Text>
            )}
          </AnimatedPressable>

          <Text style={styles.priceFootnote}>
            {PRO_PRICE_DISPLAY}, billed monthly. Cancel anytime.
          </Text>

          <Pressable
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isLoading}
          >
            {isRestoring ? (
              <ActivityIndicator color={C.amber} size="small" />
            ) : (
              <Text style={[styles.restoreText, isLoading && styles.restoreTextDisabled]}>Restore Purchases</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
    paddingHorizontal: S[6],
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    paddingVertical: S[3],
    paddingLeft: S[4],
    minHeight: 44,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: T.sm,
    color: C.ash,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[4],
  },
  sparkle: {
    fontSize: 56,
    color: C.amber,
    lineHeight: 72,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: C.cream,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  featureList: {
    gap: S[3],
    alignSelf: 'stretch',
    marginTop: S[4],
    backgroundColor: C.ink2,
    borderRadius: R.xl,
    padding: S[5],
    borderWidth: 1,
    borderColor: C.amber + '33',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  featureIcon: {
    fontSize: T.xl,
    color: C.amber,
    width: 28,
    textAlign: 'center',
  },
  featureLabel: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '500',
  },
  actions: {
    gap: S[3],
    paddingBottom: S[4],
  },
  unlockBtn: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  unlockBtnDisabled: {
    opacity: 0.55,
  },
  unlockBtnText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.ink1,
    letterSpacing: 0.3,
  },
  restoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  priceFootnote: {
    fontSize: T.xs,
    color: C.ash,
    textAlign: 'center',
  },
  restoreText: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '500',
  },
  restoreTextDisabled: {
    opacity: 0.4,
  },
});
