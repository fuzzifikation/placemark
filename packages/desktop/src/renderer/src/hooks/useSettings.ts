/**
 * useSettings — centralized settings persistence hook.
 *
 * Loads from localStorage, persists on every change.
 * Single source of truth for all app settings.
 */

import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from '../components/Settings';

const SETTINGS_KEY = 'placemark-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Corrupt localStorage — fall back to defaults
  }
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}
