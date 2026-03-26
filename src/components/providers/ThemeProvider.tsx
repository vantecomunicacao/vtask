import { useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';

const THEME_CLASSES = ['theme-default', 'theme-elevated', 'theme-minimal'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const darkMode = useThemeStore((s) => s.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    THEME_CLASSES.forEach((cls) => root.classList.remove(cls));
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  return <>{children}</>;
}
