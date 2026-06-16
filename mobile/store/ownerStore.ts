import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OwnerStore {
  isOwner: boolean;
  setOwner: (value: boolean) => void;
}

export const useOwnerStore = create<OwnerStore>()(
  persist(
    (set) => ({
      isOwner: false,
      setOwner: (value: boolean) => set({ isOwner: value }),
    }),
    { name: 'filetrail-owner', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
