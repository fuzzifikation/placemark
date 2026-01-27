/**
 * useTheme - Manages theme state with localStorage persistence
 */

import { useState, useEffect } from 'react';
import { type Theme, getThemeColors } from '../theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('placemark-theme');
    return (saved as Theme) || 'light';
  });

  const colors = getThemeColors(theme);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('placemark-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    theme,
    colors,
    toggleTheme,
  };
}
