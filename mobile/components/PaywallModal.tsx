/**
 * PaywallModal.tsx — Full-screen Pro paywall modal
 *
 * Shows FileTrail Pro features and an "Unlock Pro" CTA.
 * Calls purchasePro() on confirm and restorePurchases() on restore.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, R, S } from '@/theme/tokens';

const PRO_FEATURES = [
  { icon: '∞', label: 'Unlimited Documents' },
  { icon: '✦', label: 'AI Auto-fill' },
  { icon: '📁', label: 'Folders' },
  { icon: '☁️', label: 'Cloud Backup' },
];

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaywallModal({ visible, onClose, onSuccess }: PaywallModalProps) {
  const insets = useSafeAreaInsets();

  const handleUnlock = async () => {
    Alert.alert(
      'Coming Soon',
      'In-app purchases will be available in the next update. Thank you for your patience!',
      [{ text: 'OK' }]
    );
  };

  const handleRestore = async () => {
    Alert.alert(
      'Coming Soon',
      'Purchase restoration will be available once payments are live.',
      [{ text: 'OK' }]
    );
  };

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
          hitSlop={8}
        >
          <Text style={styles.dismissText}>Maybe Later</Text>
        </Pressable>

        {/* Content */}
        <View style={styles.body}>
          {/* Icon + heading */}
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.heading}>FileTrail Pro</Text>
          <Text style={styles.subheading}>
            Unlock the full power of your document vault.
          </Text>

          {/* Feature list */}
          <View style={styles.featureList}>
            {PRO_FEATURES.map(({ icon, label }) => (
              <View key={label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{icon}</Text>
                <Text style={styles.featureLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.unlockBtn}
            onPress={handleUnlock}
          >
            <Text style={styles.unlockBtnText}>Unlock Pro — Coming Soon</Text>
          </Pressable>

          <Pressable
            style={styles.restoreBtn}
            onPress={handleRestore}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
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
  restoreText: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '500',
  },
});
