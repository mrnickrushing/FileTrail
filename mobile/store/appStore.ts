/**
 * appStore.ts — App-level Zustand store with persistence (Phase 8)
 *
 * Persists: biometricEnabled, hasOnboarded, viewMode, sortBy, sortDir
 * Runtime-only: isLocked (always starts locked if biometric is enabled)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  // Lock
  isLocked: boolean;
  biometricEnabled: boolean;
  hasOnboarded: boolean;

  // Settings
  viewMode: 'card' | 'list';
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'category';
  sortDir: 'asc' | 'desc';
  autoOcr: boolean;

  // Pro
  isPro: boolean;

  // Actions
  setLocked: (locked: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  setViewMode: (mode: 'card' | 'list') => void;
  setSortBy: (by: AppState['sortBy']) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setAutoOcr: (enabled: boolean) => void;
  setIsPro: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isLocked: false,
      biometricEnabled: false,
      hasOnboarded: false,
      viewMode: 'card',
      sortBy: 'updatedAt',
      sortDir: 'desc',
      autoOcr: true,
      isPro: false,

      setLocked: (isLocked) => set({ isLocked }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDir: (sortDir) => set({ sortDir }),
      setAutoOcr: (autoOcr) => set({ autoOcr }),
      setIsPro: (isPro) => set({ isPro }),
    }),
    {
      name: 'papertrail-app-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // isLocked is always runtime — never persisted
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        hasOnboarded: state.hasOnboarded,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        autoOcr: state.autoOcr,
        isPro: state.isPro,
      }),
    }
  )
);
