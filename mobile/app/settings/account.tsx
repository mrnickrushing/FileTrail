import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useDocumentStore, useAppStore } from '@/store';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { deleteStoredPasswordHash, deleteStoredStorageAccessToken } from '@/services/secureCredentials';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Divider,
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

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
              await deleteStoredStorageAccessToken();
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
  pressed: {
    opacity: 0.8,
  },
});
