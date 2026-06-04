/**
 * proStore.ts — Zustand store for RevenueCat Pro entitlement state
 */

import { create } from 'zustand';
import { checkProEntitlement } from '@/services/purchases';

export const FREE_DOCUMENT_LIMIT = 3;

interface ProState {
  isPro: boolean;
  isChecking: boolean;
  checkPro: () => Promise<void>;
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  isChecking: false,
  checkPro: async () => {
    set({ isChecking: true });
    try {
      const result = await checkProEntitlement();
      set({ isPro: result });
    } finally {
      set({ isChecking: false });
    }
  },
}));
