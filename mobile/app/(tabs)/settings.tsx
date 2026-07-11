import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useAppStore, useProStore, useOwnerStore, PRO_PRICE_DISPLAY_SHORT } from '@/store';
import { CURRENT_APP_VERSION } from '@/store/appStore';
import { TourBubble } from '@/components/TourBubble';
import { useTourTip } from '@/hooks/useTourTip';
import { PaywallModal } from '@/components/PaywallModal';
import { FAB } from '@/components/FAB';
import {
  SettingsTabShell,
  SectionHeader,
  SettingsCard,
  SettingsNavRow,
  Hint,
} from '@/components/settings/SettingsUi';
import { C, R, S, T, Springs } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SettingsScreen() {
  const router = useRouter();
  const accountProfile = useAppStore((s) => s.accountProfile);
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const lastSeenChangelogVersion = useAppStore((s) => s.lastSeenChangelogVersion);
  const hasNewChangelog = lastSeenChangelogVersion !== null && lastSeenChangelogVersion !== CURRENT_APP_VERSION;
  const isPro = useProStore((s) => s.isPro);
  const checkPro = useProStore((s) => s.checkPro);
  const isOwner = useOwnerStore((s) => s.isOwner);
  const [showPaywall, setShowPaywall] = React.useState(false);
  const reducedMotion = useReducedMotion();
  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  return (
    <SettingsTabShell
      title="Settings"
      overlay={<FAB onPress={() => router.push('/capture')} />}
    >
      <SectionHeader title="Workspace" icon="grid" />
      <SettingsCard>
        <SettingsNavRow
          label="Account"
          value={accountProfile?.email ?? 'Manage sign-in and owner access'}
          icon="user"
          onPress={() => router.push('/settings/account')}
        />
        <SettingsNavRow
          label="Backup & Restore"
          value="Save or restore a local .ptbak file"
          icon="hard-drive"
          onPress={() => router.push('/settings/storage')}
        />
        <SettingsNavRow
          label="Email to Vault"
          value="Forward documents into Autopilot"
          icon="mail"
          onPress={() => router.push('/settings/email')}
        />
        <SettingsNavRow
          label="Security"
          value={biometricEnabled ? 'Biometric lock on' : 'Biometric lock off'}
          icon="shield"
          onPress={() => router.push('/settings/security')}
        />
        <SettingsNavRow
          label="About"
          value="Version, build, and AI usage"
          icon="info"
          badge={hasNewChangelog ? "What's new" : undefined}
          onPress={() => router.push('/settings/about')}
        />
      </SettingsCard>

      {isOwner && (
        <>
          <SectionHeader title="Owner" icon="shield" />
          <SettingsCard>
            <SettingsNavRow
              label="Cloud Sync"
              value="R2 upload, sync state, backend controls"
              icon="cloud"
              onPress={() => router.push('/settings/storage')}
            />
          </SettingsCard>
          <Hint>Owner mode is active. Cloud controls are only visible to you.</Hint>
        </>
      )}

      <SectionHeader title="Upgrade" icon="zap" />
      <Animated.View
        entering={reducedMotion ? undefined : FadeInUp.duration(220)}
        style={styles.proCard}
      >
        <View style={styles.proCardHeader}>
          <Text style={styles.proTitle}>FileTrail Pro</Text>
          <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
        </View>
        <Text style={styles.proBody}>
          AI auto-naming, expiry detection, smart filing, and priority support.
        </Text>
        <View style={styles.proFeatures}>
          {['🤖 AI auto-naming', '🗂 Smart filing', '🔔 Expiry alerts', '⭐ Priority support'].map((feature) => (
            <Text key={feature} style={styles.proFeatureItem}>{feature}</Text>
          ))}
        </View>
        <View style={styles.proAction}>
          <Text style={styles.proPrice}>{isPro ? 'Pro unlocked' : PRO_PRICE_DISPLAY_SHORT}</Text>
          <AnimatedPressable
            style={[styles.proCTA, isPro && styles.proCTADisabled, ctaStyle]}
            onPressIn={() => { if (!isPro && !reducedMotion) ctaScale.value = withSpring(0.95, Springs.snappy); }}
            onPressOut={() => { ctaScale.value = withSpring(1, Springs.snappy); }}
            onPress={() => setShowPaywall(true)}
            disabled={isPro}
            accessibilityRole="button"
            accessibilityLabel={isPro ? 'FileTrail Pro is already unlocked' : 'Unlock FileTrail Pro'}
          >
            <Text style={styles.proCTAText}>{isPro ? 'Pro Active' : 'Unlock Pro'}</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>

      <Hint>
        Capture is available everywhere now. Use the + button from any tab to add a document without jumping back to Vault.
      </Hint>

      {showPaywall && (
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            setShowPaywall(false);
            void checkPro();
          }}
        />
      )}
      <SettingsTourTip />
    </SettingsTabShell>
  );
}

function SettingsTourTip() {
  const { visible, dismiss } = useTourTip('settings-backup');
  const insets = useSafeAreaInsets();
  return (
    <TourBubble
      title="Customize your experience"
      body="Set up biometric lock, forward documents via email, or unlock Pro for AI-powered filing."
      visible={visible}
      onDismiss={dismiss}
      anchor={{ bottom: Math.max(insets.bottom, 16) + 16, left: 12, right: 12 }}
      arrow="none"
    />
  );
}

const styles = StyleSheet.create({
  proCard: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    padding: S[4],
    gap: S[3],
    marginBottom: S[2],
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proTitle: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  proBadgeText: {
    fontSize: T.xs,
    color: C.amber,
    fontWeight: '700',
  },
  proBody: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
  },
  proFeatures: {
    gap: S[2],
  },
  proFeatureItem: {
    fontSize: T.sm,
    color: C.cream,
  },
  proAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[3],
    marginTop: S[1],
  },
  proPrice: {
    flex: 1,
    fontSize: T.sm,
    color: C.ash,
    fontWeight: '600',
  },
  proCTA: {
    minHeight: 42,
    borderRadius: R.md,
    backgroundColor: C.amber,
    paddingHorizontal: S[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCTADisabled: {
    backgroundColor: C.ink3,
  },
  proCTAText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
  },
});
