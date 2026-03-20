/**
 * useSettings — centralized settings persistence hook.
 *
 * Loads from localStorage with schema migration, persists on every change.
 * Single source of truth — replaces ad-hoc localStorage.getItem calls scattered
 * across App.tsx and Settings.tsx.
 */

import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from '../components/Settings';

const SETTINGS_KEY = 'placemark-settings';
const SETTINGS_VERSION = 2; // increment when AppSettings shape changes

function migrateSettings(saved: Partial<AppSettings> & { _version?: number }): AppSettings {
  const version = saved._version ?? 1;
  const migrated = { ...DEFAULT_SETTINGS, ...saved };

  // v1 → v2: spiderRadius changed from degree-based floats (~0.0004) to pixels (~60)
  if (version < 2 && migrated.spiderRadius < 1) {
    migrated.spiderRadius = DEFAULT_SETTINGS.spiderRadius;
  }

  return migrated;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return migrateSettings(JSON.parse(raw));
  } catch {
    // Corrupt localStorage — fall back to defaults
  }
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, _version: SETTINGS_VERSION }));
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, setSettings, updateSetting };
}
