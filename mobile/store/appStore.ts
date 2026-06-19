/**
 * appStore.ts — App-level Zustand store with persistence (Phase 8)
 *
 * Persists: biometricEnabled, hasOnboarded, viewMode, sortBy, sortDir
 * Runtime-only: isLocked (always starts locked if biometric is enabled)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const CURRENT_APP_VERSION = Constants.expoConfig?.version ?? 'unknown';

export type AccountProvider = 'email' | 'apple';

export interface AccountProfile {
  fullName: string;
  email: string;
  provider: AccountProvider;
  appleUserId?: string;
  storageAccessToken?: string;
  /**
   * Legacy field — older builds stored the password hash here, persisted to
   * AsyncStorage as plain JSON. New hashes live in expo-secure-store (see
   * services/secureCredentials.ts) instead. This stays optional only so the
   * one-time migration in app/account.tsx can read and clear leftover values;
   * `partialize` below strips it before anything is written to disk.
   */
  passwordHash?: string;
  createdAt: string;
  userId?: string;
}

interface AppState {
  // Lock
  hasHydrated: boolean;
  isLocked: boolean;
  biometricEnabled: boolean;
  hasOnboarded: boolean;
  accountProfile: AccountProfile | null;
  isAccountAuthenticated: boolean;

  // Last app version the user has seen the "what's new" changelog for —
  // null only before this field's first hydration, then always set.
  lastSeenChangelogVersion: string | null;

  // Settings
  viewMode: 'card' | 'list';
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'category';
  sortDir: 'asc' | 'desc';
  autoOcr: boolean;

  // AI usage — running total of estimated Claude API spend on this device
  aiUsageCostUsd: number;
  aiUsageCallCount: number;

  // Actions
  setHasHydrated: (hydrated: boolean) => void;
  setLocked: (locked: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  completeAccountSetup: (profile: AccountProfile) => void;
  setAccountAuthenticated: (value: boolean) => void;
  clearAccountSession: () => void;
  clearAccountProfile: () => void;
  markChangelogSeen: () => void;
  setViewMode: (mode: 'card' | 'list') => void;
  setSortBy: (by: AppState['sortBy']) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setAutoOcr: (enabled: boolean) => void;
  recordAiUsageCost: (costUsd: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      isLocked: false,
      biometricEnabled: false,
      hasOnboarded: false,
      accountProfile: null,
      isAccountAuthenticated: false,
      lastSeenChangelogVersion: null,
      viewMode: 'card',
      sortBy: 'updatedAt',
      sortDir: 'desc',
      autoOcr: true,
      aiUsageCostUsd: 0,
      aiUsageCallCount: 0,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setLocked: (isLocked) => set({ isLocked }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      completeAccountSetup: (accountProfile) => set({
        accountProfile,
        isAccountAuthenticated: true,
      }),
      setAccountAuthenticated: (isAccountAuthenticated) => set({ isAccountAuthenticated }),
      clearAccountSession: () => set({ isAccountAuthenticated: false }),
      clearAccountProfile: () => set({
        accountProfile: null,
        isAccountAuthenticated: false,
      }),
      markChangelogSeen: () => set({ lastSeenChangelogVersion: CURRENT_APP_VERSION }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDir: (sortDir) => set({ sortDir }),
      setAutoOcr: (autoOcr) => set({ autoOcr }),
      recordAiUsageCost: (costUsd) => set((state) => ({
        aiUsageCostUsd: state.aiUsageCostUsd + costUsd,
        aiUsageCallCount: state.aiUsageCallCount + 1,
      })),
    }),
    {
      name: 'filetrail-app-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // isLocked is always runtime — never persisted
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        hasOnboarded: state.hasOnboarded,
        // Never write passwordHash to AsyncStorage — it lives in
        // expo-secure-store instead (see services/secureCredentials.ts).
        accountProfile: state.accountProfile
          ? { ...state.accountProfile, passwordHash: undefined }
          : null,
        isAccountAuthenticated: state.isAccountAuthenticated,
        lastSeenChangelogVersion: state.lastSeenChangelogVersion,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        autoOcr: state.autoOcr,
        aiUsageCostUsd: state.aiUsageCostUsd,
        aiUsageCallCount: state.aiUsageCallCount,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Lock on cold start if biometric is enabled so the LockScreen
        // shows immediately rather than only after a background→foreground cycle.
        if (state?.biometricEnabled) {
          state.setLocked(true);
        }
        // First-ever hydration of this field — baseline it to the current
        // version so existing installs don't see a spurious "what's new"
        // badge the moment this feature ships.
        if (state && state.lastSeenChangelogVersion == null) {
          state.markChangelogSeen();
        }
      },
    }
  )
);
