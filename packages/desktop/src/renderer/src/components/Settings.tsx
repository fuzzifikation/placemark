/**
 * Settings component - configure app parameters
 * Redesigned with sidebar navigation, search, and better organization
 *
 * ⚠️ SINGLE SOURCE OF TRUTH FOR DEFAULTS ⚠️
 * All default configuration values are defined in DEFAULT_SETTINGS below.
 * Other components MUST import and use these values - never define their own defaults.
 * This ensures consistency and eliminates duplicate configuration maintenance.
 */

import { useState, useEffect } from 'react';
import { type Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { StorageSettings } from './Settings/StorageSettings';
import { AboutSection } from './Settings/AboutSection';
import { AppearanceSettings } from './Settings/AppearanceSettings';
import { MapDisplaySettings } from './Settings/MapDisplaySettings';
import { TimelineSettings } from './Settings/TimelineSettings';
import { AdvancedSettings } from './Settings/AdvancedSettings';
import { FONT_FAMILY } from '../constants/ui';
import type { SpiderSettings } from './MapView';

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  theme: Theme;
  onThemeChange: () => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

export interface AppSettings {
  // Map Clustering
  clusteringEnabled: boolean;
  clusterRadius: number;
  clusterMaxZoom: number;
  // Map Display
  mapMaxZoom: number;
  mapPadding: number;
  mapTransitionDuration: number;
  showHeatmap: boolean;
  // Timeline
  timelineUpdateInterval: number;
  autoZoomDuringPlay: boolean;
  // UI Settings
  toastDuration: number; // ms - how long toasts stay visible
  // Developer Settings (fine-tuning)
  devSettingsEnabled: boolean;
  tileMaxZoom: number; // Max zoom level for map tiles
  spiderOverlapTolerance: number; // Pixels - how close points must be visually to overlap
  spiderRadius: number; // Pixels - visual radius of spider circle on screen
  spiderAnimationDuration: number; // ms - spider expand/collapse animation
  spiderTriggerZoom: number; // Zoom level at which clusters spider instead of zoom
  spiderCollapseMargin: number; // Pixels - how far mouse can leave spider before it closes
  spiderClearZoom: number; // Auto-clear spider when zooming below this level
}

// SINGLE SOURCE OF TRUTH: All default values are defined here
// Other components should import and use these defaults, never define their own
export const DEFAULT_SETTINGS: AppSettings = {
  clusteringEnabled: true,
  clusterRadius: 30,
  clusterMaxZoom: 14,
  mapMaxZoom: 15,
  mapPadding: 50,
  mapTransitionDuration: 200,
  showHeatmap: false,
  timelineUpdateInterval: 100,
  autoZoomDuringPlay: true,
  // UI defaults
  toastDuration: 3000, // 3 seconds
  // Developer defaults
  devSettingsEnabled: false,
  tileMaxZoom: 18, // OSM tiles work up to 19, but 18 is safer
  spiderOverlapTolerance: 20, // pixels - roughly size of a photo dot
  spiderRadius: 60, // pixels - visual radius of spider circle on screen
  spiderAnimationDuration: 300,
  spiderTriggerZoom: 6,
  spiderCollapseMargin: 30, // pixels - mouse distance beyond spider before collapse
  spiderClearZoom: 7, // auto-clear spider when zooming below this
};

// Default spider settings as a SpiderSettings object
export const getDefaultSpiderSettings = (): SpiderSettings => ({
  overlapTolerance: DEFAULT_SETTINGS.spiderOverlapTolerance,
  radius: DEFAULT_SETTINGS.spiderRadius,
  animationDuration: DEFAULT_SETTINGS.spiderAnimationDuration,
  triggerZoom: DEFAULT_SETTINGS.spiderTriggerZoom,
  collapseMargin: DEFAULT_SETTINGS.spiderCollapseMargin,
  clearZoom: DEFAULT_SETTINGS.spiderClearZoom,
});

// Settings version for migration
const SETTINGS_VERSION = 2; // Increment when settings format changes

/**
 * Migrate old settings to new format
 */
function migrateSettings(saved: Partial<AppSettings> & { _version?: number }): AppSettings {
  const version = saved._version ?? 1;
  const migrated = { ...DEFAULT_SETTINGS, ...saved };

  // v1 -> v2: spiderRadius changed from degrees (~0.0004) to pixels (~60)
  if (version < 2) {
    // If spiderRadius is suspiciously small (< 1), it's the old degree-based value
    if (migrated.spiderRadius < 1) {
      migrated.spiderRadius = DEFAULT_SETTINGS.spiderRadius;
    }
  }

  return migrated;
}

export function Settings({
  onClose,
  onSettingsChange,
  theme,
  onThemeChange,
  toast,
}: SettingsProps) {
  const colors = useThemeColors(theme);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('placemark-settings');
    if (saved) {
      return migrateSettings(JSON.parse(saved));
    }
    return DEFAULT_SETTINGS;
  });

  const [activeSection, setActiveSection] = useState('appearance');

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'map', label: 'Map & Display', icon: '🗺️' },
    { id: 'timeline', label: 'Timeline', icon: '⏱️' },
    { id: 'storage', label: 'Storage', icon: '💾' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  useEffect(() => {
    // Save settings with version for future migrations
    localStorage.setItem(
      'placemark-settings',
      JSON.stringify({ ...settings, _version: SETTINGS_VERSION })
    );
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const resetAllSettings = () => {
    // Reset theme to light mode (default)
    if (theme !== 'light') {
      onThemeChange();
    }
    setSettings(DEFAULT_SETTINGS);
    toast.success('All settings reset to defaults');
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Reset functions for individual sections
  const resetAppearance = () => {
    // Reset theme to light mode (default)
    if (theme !== 'light') {
      onThemeChange();
    }
    updateSetting('devSettingsEnabled', DEFAULT_SETTINGS.devSettingsEnabled);
    toast.success('Appearance settings reset');
  };

  const resetMap = () => {
    updateSetting('clusteringEnabled', DEFAULT_SETTINGS.clusteringEnabled);
    updateSetting('clusterRadius', DEFAULT_SETTINGS.clusterRadius);
    updateSetting('clusterMaxZoom', DEFAULT_SETTINGS.clusterMaxZoom);
    updateSetting('mapMaxZoom', DEFAULT_SETTINGS.mapMaxZoom);
    updateSetting('mapPadding', DEFAULT_SETTINGS.mapPadding);
    updateSetting('mapTransitionDuration', DEFAULT_SETTINGS.mapTransitionDuration);
    updateSetting('showHeatmap', DEFAULT_SETTINGS.showHeatmap);
    toast.success('Map & Display settings reset');
  };

  const resetTimeline = () => {
    updateSetting('timelineUpdateInterval', DEFAULT_SETTINGS.timelineUpdateInterval);
    updateSetting('autoZoomDuringPlay', DEFAULT_SETTINGS.autoZoomDuringPlay);
    toast.success('Timeline settings reset');
  };

  const resetAdvanced = () => {
    updateSetting('toastDuration', DEFAULT_SETTINGS.toastDuration);
    updateSetting('tileMaxZoom', DEFAULT_SETTINGS.tileMaxZoom);
    updateSetting('spiderOverlapTolerance', DEFAULT_SETTINGS.spiderOverlapTolerance);
    updateSetting('spiderRadius', DEFAULT_SETTINGS.spiderRadius);
    updateSetting('spiderAnimationDuration', DEFAULT_SETTINGS.spiderAnimationDuration);
    updateSetting('spiderTriggerZoom', DEFAULT_SETTINGS.spiderTriggerZoom);
    updateSetting('spiderCollapseMargin', DEFAULT_SETTINGS.spiderCollapseMargin);
    updateSetting('spiderClearZoom', DEFAULT_SETTINGS.spiderClearZoom);
    toast.success('Advanced settings reset');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: FONT_FAMILY,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.modalBackground,
          color: colors.textPrimary,
          borderRadius: '12px',
          width: '90vw',
          maxWidth: '1200px',
          height: '85vh',
          maxHeight: '800px',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar Navigation */}
        <div
          style={{
            width: '280px',
            backgroundColor: colors.surface,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem 1rem 1rem',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Settings</h2>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  backgroundColor: activeSection === section.id ? colors.primary : 'transparent',
                  color: activeSection === section.id ? colors.buttonText : colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: activeSection === section.id ? 600 : 400,
                  borderRadius: '0 6px 6px 0',
                  marginRight: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>

          {/* Footer with Reset All */}
          <div
            style={{
              padding: '1rem',
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <button
              onClick={resetAllSettings}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.75rem',
                backgroundColor: colors.surface,
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Reset all settings to defaults"
            >
              🔄 Reset All
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Section Content */}
          {activeSection === 'appearance' && (
            <AppearanceSettings
              theme={theme}
              onThemeChange={onThemeChange}
              onReset={resetAppearance}
            />
          )}

          {activeSection === 'map' && (
            <MapDisplaySettings
              theme={theme}
              settings={settings}
              onSettingChange={updateSetting}
              onReset={resetMap}
            />
          )}

          {activeSection === 'timeline' && (
            <TimelineSettings
              theme={theme}
              settings={settings}
              onSettingChange={updateSetting}
              onReset={resetTimeline}
            />
          )}

          {activeSection === 'storage' && <StorageSettings theme={theme} toast={toast} />}

          {activeSection === 'advanced' && (
            <AdvancedSettings
              theme={theme}
              settings={settings}
              onSettingChange={updateSetting}
              onReset={resetAdvanced}
            />
          )}

          {activeSection === 'about' && <AboutSection theme={theme} />}

          {/* Footer Actions */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '1.5rem',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1.5rem',
                fontSize: '0.875rem',
                backgroundColor: colors.primary,
                color: colors.buttonText,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
