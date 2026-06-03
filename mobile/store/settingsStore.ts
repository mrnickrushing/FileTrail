import { create } from 'zustand';

interface SettingsState {
  biometricEnabled:  boolean;
  theme:             'dark' | 'light' | 'system';
  defaultCategory:   string;
  autoOcr:           boolean;
  isPro:             boolean;

  setBiometric:     (enabled: boolean) => void;
  setTheme:         (theme: 'dark' | 'light' | 'system') => void;
  setDefaultCat:    (cat: string) => void;
  setAutoOcr:       (enabled: boolean) => void;
  setIsPro:         (isPro: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  biometricEnabled: false,
  theme:            'system',
  defaultCategory:  'other',
  autoOcr:          true,
  isPro:            false,

  setBiometric:  (enabled)  => set({ biometricEnabled: enabled }),
  setTheme:      (theme)    => set({ theme }),
  setDefaultCat: (cat)      => set({ defaultCategory: cat }),
  setAutoOcr:    (enabled)  => set({ autoOcr: enabled }),
  setIsPro:      (isPro)    => set({ isPro }),
}));
