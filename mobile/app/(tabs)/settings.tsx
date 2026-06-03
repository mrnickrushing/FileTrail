import React from 'react';
import {
  View, Text, Switch, StyleSheet,
  ScrollView, Pressable, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    biometricEnabled, setBiometric,
    autoOcr, setAutoOcr,
    isPro,
  } = useSettingsStore();

  const showProUpsell = () => {
    Alert.alert(
      'PaperTrail Pro',
      'Unlock cloud sync, AI organization, expiry alerts, shared vaults, and natural-language search for $4.99/mo.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => {} },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing['4'] }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Pro Banner */}
      {!isPro && (
        <Pressable style={styles.proBanner} onPress={showProUpsell}>
          <View>
            <Text style={styles.proBannerTitle}>⚡ Go Pro</Text>
            <Text style={styles.proBannerSub}>
              Cloud sync, AI, sharing & more
            </Text>
          </View>
          <Text style={styles.proBannerCta}>Upgrade →</Text>
        </Pressable>
      )}

      {/* Security */}
      <SettingSection title="Security">
        <SettingRow
          label="Biometric Lock"
          sub="Require Face ID / Touch ID to open PaperTrail"
        >
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometric}
            trackColor={{ false: Colors.surfaceDynamic, true: Colors.primary }}
            thumbColor={Colors.text}
          />
        </SettingRow>
      </SettingSection>

      {/* Documents */}
      <SettingSection title="Documents">
        <SettingRow
          label="Auto-OCR on Import"
          sub="Extract text from documents automatically"
        >
          <Switch
            value={autoOcr}
            onValueChange={setAutoOcr}
            trackColor={{ false: Colors.surfaceDynamic, true: Colors.primary }}
            thumbColor={Colors.text}
          />
        </SettingRow>
      </SettingSection>

      {/* About */}
      <SettingSection title="About">
        <SettingRow label="Version" sub="1.0.0 (Phase 1 — Foundation)">
          <Text style={styles.rowValue}>1.0.0</Text>
        </SettingRow>
        <SettingRow label="License" sub="MIT">
          <Text style={styles.rowValue}>MIT</Text>
        </SettingRow>
      </SettingSection>
    </ScrollView>
  );
}

function SettingSection({
  title, children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  label, sub, children,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing['6'],
    paddingBottom:     Spacing['4'],
  },
  title: {
    fontSize:      Typography.xxl,
    fontWeight:    Typography.bold,
    color:         Colors.text,
    letterSpacing: -0.5,
  },
  proBanner: {
    marginHorizontal: Spacing['4'],
    marginBottom:     Spacing['4'],
    backgroundColor:  Colors.primaryHighlight,
    borderRadius:     Radius.xl,
    padding:          Spacing['5'],
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    borderWidth:      1,
    borderColor:      Colors.primary,
    ...Shadows.md,
  },
  proBannerTitle: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.primary,
  },
  proBannerSub: {
    fontSize:  Typography.sm,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  proBannerCta: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },
  section:      { marginBottom: Spacing['6'], paddingHorizontal: Spacing['4'] },
  sectionTitle: {
    fontSize:     Typography.xs,
    fontWeight:   Typography.semibold,
    color:        Colors.textFaint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  Spacing['2'],
    paddingLeft:   Spacing['2'],
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    ...Shadows.sm,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    minHeight:       56,
    gap:             Spacing['3'],
  },
  rowLeft:  { flex: 1 },
  rowLabel: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.text },
  rowSub:   { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: Typography.sm, color: Colors.textFaint },
});
