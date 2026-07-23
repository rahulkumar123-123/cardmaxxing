import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Favorite } from '@/types';

interface FavoritesState {
  favorites: Favorite[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (cardId: string) => Promise<void>;
  has: (cardId: string) => boolean;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    try {
      const { favorites } = await api.favorites.list();
      set({ favorites, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  /** Optimistic toggle — the row is removed or re-added immediately, then reconciled. */
  toggle: async (cardId) => {
    const existing = get().favorites.find((favorite) => favorite.cardId === cardId);
    if (existing) {
      set({ favorites: get().favorites.filter((favorite) => favorite.cardId !== cardId) });
      try {
        await api.favorites.remove(cardId);
      } catch (error) {
        set({ favorites: [existing, ...get().favorites] });
        throw error;
      }
      return;
    }
    const { favorite } = await api.favorites.add(cardId);
    set({ favorites: [favorite, ...get().favorites] });
  },

  has: (cardId) => get().favorites.some((favorite) => favorite.cardId === cardId),
  reset: () => set({ favorites: [], loaded: false }),
}));
