import { useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useThemeStore((s) => s.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  return <>{children}</>;
}
