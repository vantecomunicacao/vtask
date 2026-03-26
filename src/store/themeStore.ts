import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'default' | 'elevated' | 'minimal';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Warm minimal — sombras ultra sutis',
  },
  {
    id: 'elevated',
    label: 'Elevado',
    description: 'Mais profundidade e bordas arredondadas',
  },
  {
    id: 'minimal',
    label: 'Flat',
    description: 'Sem sombras, bordas nítidas',
  },
];

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      setTheme: (theme) => set({ theme }),
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    { name: 'vflow-theme' }
  )
);
