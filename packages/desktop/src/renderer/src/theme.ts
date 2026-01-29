/**
 * Theme system - light and dark mode color schemes
 */

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  surfaceHover: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Brand colors
  primary: string;
  primaryHover: string;
  secondary: string;

  // Borders
  border: string;
  borderLight: string;

  // Interactive states
  buttonBackground: string;
  buttonHover: string;
  buttonText: string;

  // Status colors
  success: string;
  warning: string;
  error: string;

  // Overlay
  overlay: string;
  modalBackground: string;

  // Glassmorphism
  glassSurface: string;
  glassBorder: string;
  shadow: string;
}

export const lightTheme: ThemeColors = {
  // Background colors
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',

  // Text colors
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  // Brand colors
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#64748b',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Interactive states
  buttonBackground: '#2563eb',
  buttonHover: '#1d4ed8',
  buttonText: '#ffffff',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#ffffff',

  // Glassmorphism (Light)
  glassSurface: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};

export const darkTheme: ThemeColors = {
  // Background colors
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',

  // Text colors
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',

  // Brand colors
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#94a3b8',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Interactive states
  buttonBackground: '#3b82f6',
  buttonHover: '#2563eb',
  buttonText: '#ffffff',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#1e293b',

  // Glassmorphism (Dark)
  glassSurface: 'rgba(30, 41, 59, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  shadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
};

export function getThemeColors(theme: Theme): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
