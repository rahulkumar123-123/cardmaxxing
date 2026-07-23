import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_COMPARE = 4;

interface CompareState {
  slugs: string[];
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  isFull: () => boolean;
}

/** Comparison tray, persisted so a refresh or deep link keeps the user's selection. */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) => {
        const { slugs } = get();
        if (slugs.includes(slug)) {
          set({ slugs: slugs.filter((item) => item !== slug) });
        } else if (slugs.length < MAX_COMPARE) {
          set({ slugs: [...slugs, slug] });
        }
      },
      remove: (slug) => set({ slugs: get().slugs.filter((item) => item !== slug) }),
      clear: () => set({ slugs: [] }),
      has: (slug) => get().slugs.includes(slug),
      isFull: () => get().slugs.length >= MAX_COMPARE,
    }),
    { name: 'cardmaxxing.compare' },
  ),
);
