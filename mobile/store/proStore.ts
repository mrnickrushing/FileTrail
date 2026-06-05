/**
 * proStore.ts — Zustand store for RevenueCat Pro entitlement state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkProEntitlement } from '@/services/purchases';

export const FREE_DOCUMENT_LIMIT = 3;

interface ProState {
  isPro: boolean;
  isChecking: boolean;
  hasAdminAccess: boolean;
  checkPro: () => Promise<void>;
  setAdminAccess: (enabled: boolean) => void;
}

export const useProStore = create<ProState>()(
  persist(
    (set, get) => ({
      isPro: false,
      isChecking: false,
      hasAdminAccess: false,
      checkPro: async () => {
        set({ isChecking: true });
        try {
          const result = await checkProEntitlement();
          set({ isPro: result || get().hasAdminAccess });
        } finally {
          set({ isChecking: false });
        }
      },
      setAdminAccess: (enabled) => set((state) => ({
        hasAdminAccess: enabled,
        isPro: enabled || state.isPro,
      })),
    }),
    {
      name: 'filetrail-pro-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasAdminAccess: state.hasAdminAccess,
      }),
    },
  ),
);
