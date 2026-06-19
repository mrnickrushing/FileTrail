import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useDocumentStore, useAppStore, useProStore } from '@/store';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { deleteStoredPasswordHash } from '@/services/secureCredentials';
import { isAdminBypassConfigured, validateAdminBypassCode } from '@/services/adminAccess';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Divider,
  Hint,
} from '@/components/settings/SettingsUi';
import { C, R, S, T } from '@/theme/tokens';

// Deterministic avatar background — same account always gets the same color,
// picked from the existing category palette so it stays on-brand.
const AVATAR_COLORS = Object.values(C.category);

function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(fullName: string, email: string): string {
  const source = fullName.trim() || email;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function StatusRow({
  ok,
  label,
  cta,
}: {
  ok: boolean;
  label: string;
  cta?: string;
}) {
  return (
    <View style={styles.statusRow}>
      <Feather
        name={ok ? 'check-circle' : 'slash'}
        size={18}
        color={ok ? C.success : C.ash}
      />
      <Text style={styles.statusLabel}>{label}</Text>
      {cta && <Text style={styles.statusCta}>{cta}</Text>}
      {!ok && <Feather name="chevron-right" size={16} color={C.ash} />}
    </View>
  );
}

export default function AccountSettingsScreen() {
  const router = useRouter();
  const documents = useDocumentStore((s) => s.documents);
  const folders = useDocumentStore((s) => s.folders);
  const accountProfile = useAppStore((s) => s.accountProfile);
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const clearAccountSession = useAppStore((s) => s.clearAccountSession);
  const clearAccountProfile = useAppStore((s) => s.clearAccountProfile);
  const setAdminAccess = useProStore((s) => s.setAdminAccess);
  const hasAdminAccess = useProStore((s) => s.hasAdminAccess);
  const checkPro = useProStore((s) => s.checkPro);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  const adminBypassConfigured = isAdminBypassConfigured();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'You will need to log back into your FileTrail account on this device before reopening the vault.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            clearAccountSession();
            router.replace('/account');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This removes your FileTrail account from this device and permanently deletes the local vault, including all documents and folders. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await Promise.all(documents.map((d) => deleteDocumentFiles(d.id).catch(() => undefined)));

              const documentIds = documents.map((d) => d.id);
              const folderIds = folders.map((f) => f.id);
              useDocumentStore.setState((state) => ({
                documents: [],
                folders: [],
                deletedDocumentIds: Array.from(new Set([...state.deletedDocumentIds, ...documentIds])),
                deletedFolderIds: Array.from(new Set([...state.deletedFolderIds, ...folderIds])),
              }));

              await deleteStoredPasswordHash();
              setAdminAccess(false);
              clearAccountProfile();
              router.replace('/account');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const handleAdminUnlock = () => {
    if (validateAdminBypassCode(adminCode)) {
      setAdminAccess(true);
      setAdminCode('');
      setAdminError(null);
      setShowAdminUnlock(false);
      Alert.alert('Owner Access Enabled', 'This device now bypasses the Pro paywall.');
      return;
    }

    setAdminError('Code did not match the configured owner access secret.');
  };

  const handleDisableAdminAccess = () => {
    setAdminAccess(false);
    setAdminCode('');
    setAdminError(null);
    setShowAdminUnlock(false);
    void checkPro();
  };

  const fullName = accountProfile?.fullName ?? 'FileTrail User';
  const email = accountProfile?.email ?? 'Unknown';

  return (
    <SettingsSubpageShell title="Account">
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: avatarColorFor(email) }]}>
          <Text style={styles.avatarText}>{initialsFor(fullName, email)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
        </View>
      </View>

      <SectionHeader title="Profile" icon="user" />
      <SettingsCard>
        <SettingsRow label="Name" value={fullName} />
        <Divider />
        <SettingsRow label="Email" value={email} />
        <Divider />
        <SettingsRow
          label="Sign-in Method"
          value={accountProfile?.provider === 'apple' ? 'Apple' : 'Email'}
        />
      </SettingsCard>

      <SectionHeader title="Account Status" icon="shield" />
      <SettingsCard>
        <StatusRow ok label={accountProfile?.provider === 'apple' ? 'Signed in with Apple' : 'Signed in with email'} />
        <Divider />
        <Pressable onPress={() => router.push('/settings/security')}>
          <StatusRow
            ok={biometricEnabled}
            label={biometricEnabled ? 'Biometric lock enabled' : 'Biometric lock not set up'}
            cta={biometricEnabled ? undefined : 'Set up'}
          />
        </Pressable>
      </SettingsCard>

      <SectionHeader title="Session" icon="log-out" />
      <SettingsCard>
        <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]} onPress={handleSignOut}>
          <Feather name="log-out" size={16} color={C.cream} />
          <Text style={styles.actionText}>Sign Out</Text>
        </Pressable>
        <Divider />
        <Pressable
          style={({ pressed }) => [styles.actionRow, (pressed || isDeletingAccount) && styles.pressed]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
        >
          {isDeletingAccount ? (
            <ActivityIndicator color={C.danger} />
          ) : (
            <>
              <Feather name="trash-2" size={16} color={C.danger} />
              <Text style={styles.deleteText}>Delete Account</Text>
            </>
          )}
        </Pressable>
      </SettingsCard>

      {adminBypassConfigured && (
        <>
          <SectionHeader title="Owner Access" icon="key" />
          <SettingsCard>
            <View style={styles.ownerBlock}>
              <Text style={styles.ownerTitle}>Device Pro Override</Text>
              <Text style={styles.ownerBody}>
                {hasAdminAccess
                  ? 'This device currently bypasses the Pro paywall.'
                  : 'Use the configured owner code to unlock Pro on this device.'}
              </Text>
            </View>
            <Divider />
            {hasAdminAccess ? (
              <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]} onPress={handleDisableAdminAccess}>
                <Text style={styles.actionText}>Disable Owner Access</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
                  onPress={() => {
                    setAdminError(null);
                    setShowAdminUnlock((value) => !value);
                  }}
                >
                  <Text style={styles.actionText}>{showAdminUnlock ? 'Hide Code Entry' : 'Enter Owner Code'}</Text>
                </Pressable>
                {showAdminUnlock && (
                  <View style={styles.ownerForm}>
                    <TextInput
                      style={styles.ownerInput}
                      value={adminCode}
                      onChangeText={(value) => {
                        setAdminCode(value);
                        if (adminError) setAdminError(null);
                      }}
                      placeholder="Owner access code"
                      placeholderTextColor={C.ash}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                    {adminError && <Text style={styles.ownerError}>{adminError}</Text>}
                    <Pressable
                      style={({ pressed }) => [
                        styles.ownerPrimaryBtn,
                        adminCode.trim().length === 0 && styles.ownerPrimaryBtnDisabled,
                        pressed && adminCode.trim().length > 0 && styles.pressed,
                      ]}
                      onPress={handleAdminUnlock}
                      disabled={adminCode.trim().length === 0}
                    >
                      <Text style={styles.ownerPrimaryBtnText}>Enable Owner Access</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </SettingsCard>
          <Hint>
            Owner access is device-local. It unlocks Pro on this phone only.
          </Hint>
        </>
      )}
    </SettingsSubpageShell>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    paddingVertical: S[4],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    padding: S[4],
    marginBottom: S[2],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.ink1,
  },
  profileInfo: { flex: 1, gap: 2, minWidth: 0 },
  profileName: { fontSize: T.base, fontWeight: '700', color: C.cream },
  profileEmail: { fontSize: T.sm, color: C.ash },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 52,
  },
  statusLabel: { flex: 1, fontSize: T.base, color: C.cream },
  statusCta: { fontSize: T.sm, color: C.amber, fontWeight: '600' },
  actionText: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: T.base,
    color: C.danger,
    fontWeight: '600',
  },
  ownerBlock: {
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    gap: 4,
  },
  ownerTitle: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '700',
  },
  ownerBody: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
  },
  ownerForm: {
    gap: S[3],
    paddingHorizontal: S[4],
    paddingBottom: S[4],
  },
  ownerInput: {
    backgroundColor: C.ink1,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.ink3,
    color: C.cream,
    minHeight: 48,
    paddingHorizontal: S[4],
  },
  ownerPrimaryBtn: {
    minHeight: 44,
    borderRadius: R.md,
    backgroundColor: C.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerPrimaryBtnDisabled: {
    opacity: 0.5,
  },
  ownerPrimaryBtnText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
  },
  ownerError: {
    fontSize: T.xs,
    color: C.danger,
  },
  pressed: {
    opacity: 0.8,
  },
});
