import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

const systemPrefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: systemPrefersDark() ? 'dark' : 'light',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'cardmaxxing.theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? (systemPrefersDark() ? 'dark' : 'light'));
      },
    },
  ),
);
