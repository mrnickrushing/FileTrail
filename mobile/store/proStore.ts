/**
 * proStore.ts — Zustand store for RevenueCat Pro entitlement state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkProEntitlement } from '@/services/purchases';
import { apiRequest, isBackendConfigured } from '@/services/api';

// FileTrail has no free tier — Pro is required to save any document.
export const FREE_DOCUMENT_LIMIT = 0;

// Single source of truth for the Pro price shown across onboarding, the
// paywall, and settings — keep in sync with the App Store Connect price.
export const PRO_PRICE_DISPLAY = '$5.99/month';
export const PRO_PRICE_DISPLAY_SHORT = '$5.99/mo';

interface ProState {
  isPro: boolean;
  isChecking: boolean;
  checkPro: (email?: string) => Promise<void>;
}

export const useProStore = create<ProState>()(
  persist(
    (set) => ({
      isPro: false,
      isChecking: false,
      checkPro: async (email?: string) => {
        set({ isChecking: true });
        try {
          const revenueCatPro = await checkProEntitlement();
          if (revenueCatPro) {
            set({ isPro: true });
            return;
          }
          // Fall back to backend Pro status so admin panel toggle is respected.
          if (email && isBackendConfigured()) {
            try {
              const res = await apiRequest<{ found: boolean; isPro: boolean }>(
                `/v1/users/pro-status?email=${encodeURIComponent(email)}`,
              );
              if (res.found && res.isPro) {
                set({ isPro: true });
                return;
              }
            } catch {
              // Network error — non-fatal, fall through to local state
            }
          }
          // Pro is unlocked solely via In-App Purchase (or a verified backend
          // Pro status above). There is no local/owner bypass — unlocking paid
          // functionality outside of IAP is disallowed (App Store Guideline 3.1.1).
          set({ isPro: false });
        } finally {
          set({ isChecking: false });
        }
      },
    }),
    {
      name: 'filetrail-pro-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPro: state.isPro,
      }),
    },
  ),
);
