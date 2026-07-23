import { create } from 'zustand';
import { ApiError, api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'ready';
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const message = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  /** Restores the session from the httpOnly cookie on first paint. */
  bootstrap: async () => {
    set({ status: 'loading' });
    try {
      const { user } = await api.auth.me();
      set({ user, status: 'ready', error: null });
    } catch {
      // A missing or expired session is the normal anonymous case, not an error.
      set({ user: null, status: 'ready' });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const { user } = await api.auth.login({ email, password });
      set({ user, status: 'ready' });
    } catch (error) {
      set({ error: message(error) });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ error: null });
    try {
      const { user } = await api.auth.register({ name, email, password });
      set({ user, status: 'ready' });
    } catch (error) {
      set({ error: message(error) });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } finally {
      set({ user: null });
    }
  },

  updateProfile: async (input) => {
    const { user } = await api.auth.updateProfile(input);
    set({ user });
  },

  clearError: () => set({ error: null }),
}));
