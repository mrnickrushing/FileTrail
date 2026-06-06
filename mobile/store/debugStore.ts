import { create } from 'zustand';

type DebugEntry = {
  id: number;
  at: string;
  message: string;
};

type DebugState = {
  visible: boolean;
  rootTapCount: number;
  entries: DebugEntry[];
  screenStates: Record<string, string>;
  setVisible: (visible: boolean) => void;
  toggleVisible: () => void;
  bumpRootTap: () => void;
  log: (message: string) => void;
  clear: () => void;
  setScreenState: (key: string, value: string) => void;
};

let nextDebugId = 1;

export const useDebugStore = create<DebugState>()((set) => ({
  visible: false,
  rootTapCount: 0,
  entries: [],
  screenStates: {},
  setVisible: (visible) => set({ visible }),
  toggleVisible: () => set((state) => ({ visible: !state.visible })),
  bumpRootTap: () => set((state) => ({ rootTapCount: state.rootTapCount + 1 })),
  log: (message) => set((state) => ({
    entries: [
      { id: nextDebugId++, at: new Date().toISOString().slice(11, 19), message },
      ...state.entries,
    ].slice(0, 14),
  })),
  clear: () => set({ entries: [], rootTapCount: 0, screenStates: {} }),
  setScreenState: (key, value) => set((state) => ({
    screenStates: {
      ...state.screenStates,
      [key]: value,
    },
  })),
}));
