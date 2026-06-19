import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, T, R, S, Springs } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useRowPressSpring() {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { if (!reducedMotion) scale.value = withSpring(0.98, Springs.snappy); };
  const onPressOut = () => { scale.value = withSpring(1, Springs.snappy); };
  return { style, onPressIn, onPressOut };
}

export function SettingsTabShell({
  title,
  children,
  footerInset = 100,
  overlay,
}: {
  title: string;
  children: React.ReactNode;
  footerInset?: number;
  overlay?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + footerInset }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {overlay}
    </View>
  );
}

export function SettingsSubpageShell({
  title,
  children,
  footerInset = 40,
}: {
  title: string;
  children: React.ReactNode;
  footerInset?: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.subpageHeader}>
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
          hitSlop={8}
        >
          <Text style={styles.backText}>‹ Settings</Text>
        </Pressable>
        <Text style={styles.subpageTitle}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + footerInset }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      {icon && <Feather name={icon} size={12} color={C.ash} style={styles.sectionHeaderIcon} />}
      <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
    </View>
  );
}

/** Tap-to-reveal "?" tooltip for inline help next to a setting label. */
export function InlineHelp({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const toggle = () => {
    if (!reducedMotion) scale.value = withSequence(withSpring(0.85, Springs.snappy), withSpring(1, Springs.snappy));
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.helpWrap}>
      <AnimatedPressable
        style={[styles.helpBadge, badgeStyle]}
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide help' : 'Show help'}
      >
        <Text style={styles.helpBadgeText}>?</Text>
      </AnimatedPressable>
      {expanded && (
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(160)}
          exiting={reducedMotion ? undefined : FadeOut.duration(120)}
          style={styles.helpBubble}
        >
          <Text style={styles.helpBubbleText}>{text}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function SettingsNavRow({
  label,
  value,
  icon,
  onPress,
  badge,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  /** Small text badge (e.g. "New") shown next to the label */
  badge?: string;
}) {
  const { style, onPressIn, onPressOut } = useRowPressSpring();
  return (
    <AnimatedPressable style={[styles.navRow, style]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <View style={styles.navRowMain}>
        <View style={styles.navIconWrap}>
          <Feather name={icon} size={16} color={C.amber} />
        </View>
        <View style={styles.navTextWrap}>
          <View style={styles.navLabelRow}>
            <Text style={styles.navLabel}>{label}</Text>
            {badge && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navValue} numberOfLines={1}>{value}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={C.ash} />
    </AnimatedPressable>
  );
}

export function ActionRow({
  label,
  sub,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  sub: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { style, onPressIn, onPressOut } = useRowPressSpring();
  return (
    <AnimatedPressable
      style={[styles.actionRow, disabled && styles.pressed, style]}
      onPress={onPress}
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
    >
      <View style={styles.actionContent}>
        <Text style={[styles.actionLabel, disabled && !loading && styles.actionLabelDisabled]}>
          {label}
        </Text>
        <Text style={styles.actionSub} numberOfLines={2}>{sub}</Text>
      </View>
      {loading ? <ActivityIndicator color={C.amber} /> : <Text style={styles.actionChevron}>›</Text>}
    </AnimatedPressable>
  );
}

export function ToggleField({
  label,
  sub,
  value,
  onValueChange,
  disabled,
  help,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  help?: string;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const trackStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleChange = (next: boolean) => {
    if (!reducedMotion) {
      scale.value = withSequence(withSpring(1.12, Springs.snappy), withSpring(1, Springs.snappy));
    }
    onValueChange(next);
  };

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <View style={styles.toggleLabelRow}>
          <Text style={[styles.toggleLabel, disabled && styles.toggleLabelDisabled]}>{label}</Text>
          {help && <InlineHelp text={help} />}
        </View>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Animated.View style={trackStyle}>
        <Switch
          value={value}
          onValueChange={handleChange}
          disabled={disabled}
          trackColor={{ false: C.ink4, true: C.amber }}
          thumbColor={value ? C.ink1 : C.ash}
        />
      </Animated.View>
    </View>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '< $0.01';
  return `$${amount.toFixed(2)}`;
}

export function spendWarning(amount: number): { tone: 'amber' | 'danger'; message: string } | null {
  if (amount >= 5) {
    return { tone: 'danger', message: `You’ve spent ${formatUsd(amount)} on AI Organize on this device — keep an eye on it.` };
  }
  if (amount >= 1) {
    return { tone: 'amber', message: `You’ve crossed ${formatUsd(amount)} in AI Organize spend on this device.` };
  }
  return null;
}

export function SpendWarningBanner({
  tone,
  message,
}: {
  tone: 'amber' | 'danger';
  message: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(200)}
      style={[styles.spendWarning, tone === 'danger' && styles.spendWarningDanger]}
    >
      <Text style={[styles.spendWarningText, tone === 'danger' && styles.spendWarningTextDanger]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  content: { padding: S[4], gap: S[2] },
  subpageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingBottom: S[3],
  },
  backBtn: { minWidth: 88, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: T.base, color: C.amber, fontWeight: '600' },
  subpageTitle: { fontSize: T.lg, color: C.cream, fontWeight: '700' },
  backSpacer: { width: 88 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
    marginTop: S[4],
    marginBottom: S[1],
    marginLeft: S[2],
  },
  sectionHeaderIcon: { marginTop: 1 },
  sectionHeader: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    marginBottom: S[2],
    borderWidth: 1,
    borderColor: C.ink3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 52,
  },
  rowLabel: { flex: 1, fontSize: T.base, color: C.cream },
  rowValue: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.ink3, marginLeft: S[4] },
  hint: {
    fontSize: T.xs,
    color: C.ink4,
    marginHorizontal: S[2],
    marginBottom: S[2],
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 68,
  },
  navRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    flex: 1,
    minWidth: 0,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    backgroundColor: C.amberDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextWrap: { flex: 1, gap: 2, minWidth: 0 },
  navLabelRow: { flexDirection: 'row', alignItems: 'center', gap: S[2] },
  navLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  navValue: { fontSize: T.sm, color: C.ash },
  navBadge: {
    backgroundColor: C.amber,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 1,
  },
  navBadgeText: { fontSize: 10, fontWeight: '700', color: C.ink1 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 64,
  },
  actionContent: { flex: 1, gap: 2 },
  actionLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  actionLabelDisabled: { color: C.ash },
  actionSub: { fontSize: T.sm, color: C.ash, lineHeight: 18 },
  actionChevron: { fontSize: 22, color: C.ash },
  spendWarning: {
    backgroundColor: C.amberDim,
    borderRadius: R.md,
    paddingHorizontal: S[3],
    paddingVertical: S[2] + 2,
    marginHorizontal: S[2],
    marginBottom: S[3],
  },
  spendWarningDanger: { backgroundColor: C.danger + '22' },
  spendWarningText: { fontSize: T.xs, color: C.amber, fontWeight: '600', lineHeight: 18 },
  spendWarningTextDanger: { color: C.danger },
  pressed: { opacity: 0.78 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 64,
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: S[2] },
  toggleLabel: { fontSize: T.base, color: C.cream },
  toggleLabelDisabled: { color: C.ash },
  toggleSub: { fontSize: T.xs, color: C.ash, lineHeight: 18 },
  helpWrap: { position: 'relative' },
  helpBadge: {
    width: 20,
    height: 20,
    borderRadius: R.full,
    backgroundColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBadgeText: { fontSize: T.xs, color: C.ash, fontWeight: '700' },
  helpBubble: {
    position: 'absolute',
    top: 26,
    right: 0,
    minWidth: 200,
    maxWidth: 240,
    backgroundColor: C.ink4,
    borderRadius: R.md,
    padding: S[3],
    zIndex: 10,
    elevation: 10,
  },
  helpBubbleText: { fontSize: T.xs, color: C.cream, lineHeight: 18 },
});
