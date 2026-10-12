import { create } from "zustand";

interface Registration {
  id: symbol;
  next: () => void;
  prev: () => void;
}

interface EinkPagingState {
  registrations: Registration[];
  register: (handlers: { next: () => void; prev: () => void }) => () => void;
  goNext: () => void;
  goPrev: () => void;
}

/**
 * Coordinates page turns across e-ink surfaces. Only the most recently mounted
 * surface is active, so the article drawer takes over from the list while open.
 */
export const useEinkPagingStore = create<EinkPagingState>((set, get) => ({
  registrations: [],

  register: ({ next, prev }) => {
    const id = Symbol("eink-paging");
    set((state) => ({
      registrations: [...state.registrations, { id, next, prev }],
    }));

    return () => {
      set((state) => ({
        registrations: state.registrations.filter((entry) => entry.id !== id),
      }));
    };
  },

  goNext: () => {
    const { registrations } = get();
    registrations[registrations.length - 1]?.next();
  },

  goPrev: () => {
    const { registrations } = get();
    registrations[registrations.length - 1]?.prev();
  },
}));
