import React from 'react';
import { Platform, Text, StyleSheet, Alert, View, TouchableOpacity, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useAppStore, useOwnerStore } from '@/store';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Divider,
  Hint,
  formatUsd,
  spendWarning,
  SpendWarningBanner,
} from '@/components/settings/SettingsUi';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/services/legal';
import { C, T, S } from '@/theme/tokens';

const APP_VERSION = Constants.expoConfig?.version ?? 'Unknown';
const BUILD = Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? 'Unknown'
  : Platform.OS === 'android'
    ? String(Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion ?? 'Unknown')
    : APP_VERSION;

const OWNER_CODE = process.env.EXPO_PUBLIC_ADMIN_BYPASS_CODE ?? '';
const TAPS_REQUIRED = 7;

export default function AboutSettingsScreen() {
  const aiUsageCostUsd = useAppStore((s) => s.aiUsageCostUsd);
  const aiUsageCallCount = useAppStore((s) => s.aiUsageCallCount);
  const warning = spendWarning(aiUsageCostUsd);
  const isOwner = useOwnerStore((s) => s.isOwner);
  const setOwner = useOwnerStore((s) => s.setOwner);
  const markChangelogSeen = useAppStore((s) => s.markChangelogSeen);

  React.useEffect(() => {
    markChangelogSeen();
  }, [markChangelogSeen]);

  const [tapCount, setTapCount] = React.useState(0);
  const tapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  const handleVersionTap = () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    const next = tapCount + 1;
    setTapCount(next);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);

    if (next >= TAPS_REQUIRED) {
      setTapCount(0);
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (isOwner) {
        Alert.alert('Owner Mode', 'Owner mode is active.', [
          { text: 'Disable', style: 'destructive', onPress: () => setOwner(false) },
          { text: 'OK' },
        ]);
      } else {
        promptOwnerCode(setOwner);
      }
    }
  };

  return (
    <SettingsSubpageShell title="About">
      <SectionHeader title="App" icon="info" />
      <SettingsCard>
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.7}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionValue}>
              {APP_VERSION}{isOwner ? ' ★' : ''}
              {tapCount > 0 && tapCount < TAPS_REQUIRED ? ` (${TAPS_REQUIRED - tapCount} more)` : ''}
            </Text>
          </View>
        </TouchableOpacity>
        <Divider />
        <SettingsRow label="Build" value={BUILD} />
      </SettingsCard>

      <SectionHeader title="AI Usage" icon="cpu" />
      <SettingsCard>
        <SettingsRow label="Estimated Spend" value={formatUsd(aiUsageCostUsd)} />
        <Divider />
        <SettingsRow label="AI Calls" value={`${aiUsageCallCount}`} />
      </SettingsCard>
      <Hint>
        Estimated cost of Claude API calls made for AI Organize on this device, based on Claude Haiku pricing.
      </Hint>
      {warning && <SpendWarningBanner tone={warning.tone} message={warning.message} />}

      <SectionHeader title="Legal" icon="file-text" />
      <SettingsCard>
        <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_USE_URL).catch(() => undefined)} activeOpacity={0.7}>
          <SettingsRow label="Terms of Use" value="›" />
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)} activeOpacity={0.7}>
          <SettingsRow label="Privacy Policy" value="›" />
        </TouchableOpacity>
      </SettingsCard>

      <Text style={styles.footer}>
        FileTrail stores your documents privately on your device.
      </Text>
    </SettingsSubpageShell>
  );
}

function promptOwnerCode(setOwner: (v: boolean) => void) {
  const inputValue = '';
  Alert.alert(
    'Owner Access',
    'Enter the owner passcode to unlock cloud controls.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock',
        onPress: () => {
          if (inputValue === OWNER_CODE) {
            setOwner(true);
            Alert.alert('Owner Mode Enabled', 'Cloud controls are now visible in Settings.');
          } else {
            Alert.alert('Incorrect passcode');
          }
        },
      },
    ],
  );

  // React Native Alert doesn't support text inputs natively on all platforms,
  // so we use the iOS-only 'plain-text' style via a known workaround.
  // For cross-platform, the prompt happens via Alert with a separate state capture.
  // The alert above is the standard path; the platform-specific variant below
  // overrides on iOS where prompt() is available.
  if (Platform.OS === 'ios') {
    Alert.prompt(
      'Owner Access',
      'Enter the owner passcode to unlock cloud controls.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: (code?: string) => {
            if (code === OWNER_CODE) {
              setOwner(true);
              Alert.alert('Owner Mode Enabled', 'Cloud controls are now visible in Settings.');
            } else {
              Alert.alert('Incorrect passcode');
            }
          },
        },
      ],
      'secure-text',
    );
  }
}

const styles = StyleSheet.create({
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 44,
  },
  versionLabel: {
    fontSize: T.base,
    color: C.cream,
  },
  versionValue: {
    fontSize: T.base,
    color: C.ash,
  },
  footer: {
    fontSize: T.sm,
    color: C.ink4,
    textAlign: 'center',
    marginTop: S[6],
    lineHeight: 20,
    marginHorizontal: S[2],
  },
});
