/**
 * Settings component - configure app parameters
 * Redesigned with sidebar navigation, search, and better organization
 */

import { useState, useEffect } from 'react';
import { type Theme, getThemeColors } from '../theme';
import { SettingsSlider } from './Settings/SettingsSlider';
import { SettingsToggle } from './Settings/SettingsToggle';
import { SettingsSection } from './Settings/SettingsSection';
import { StorageSettings } from './Settings/StorageSettings';
import { AboutSection } from './Settings/AboutSection';
import { FONT_FAMILY } from '../constants/ui';

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

const DEFAULT_SETTINGS: AppSettings = {
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
  toastDuration: 4000, // 4 seconds
  // Developer defaults
  devSettingsEnabled: false,
  tileMaxZoom: 18, // OSM tiles work up to 19, but 18 is safer
  spiderOverlapTolerance: 20, // pixels - roughly size of a photo dot
  spiderRadius: 60, // pixels - visual radius of spider circle on screen
  spiderAnimationDuration: 300,
  spiderTriggerZoom: 12,
  spiderCollapseMargin: 30, // pixels - mouse distance beyond spider before collapse
  spiderClearZoom: 15, // auto-clear spider when zooming below this
};

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
  const colors = getThemeColors(theme);
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
            <div>
              <div
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                    🎨 Appearance
                  </h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
                    Customize the look and feel of Placemark
                  </p>
                </div>
                <button
                  onClick={resetAppearance}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  title="Reset appearance settings"
                >
                  Reset
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Theme Toggle */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: colors.surface,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.textPrimary }}
                    >
                      Theme
                    </div>
                    <div
                      style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.25rem' }}
                    >
                      Switch between light and dark mode
                    </div>
                  </div>
                  <button
                    onClick={onThemeChange}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '1.25rem',
                      backgroundColor: colors.background,
                      color: colors.textPrimary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  >
                    {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'map' && (
            <div>
              <div
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                    🗺️ Map & Display
                  </h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
                    Configure how photos are displayed on the map
                  </p>
                </div>
                <button
                  onClick={resetMap}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  title="Reset map settings"
                >
                  Reset
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Clustering */}
                <SettingsSection
                  title="Marker Clustering"
                  expanded={true}
                  onToggle={() => {}}
                  theme={theme}
                >
                  <SettingsToggle
                    label="Enable marker clustering"
                    value={settings.clusteringEnabled}
                    description="Group nearby photos into clusters to improve performance with many photos"
                    onChange={(val) => updateSetting('clusteringEnabled', val)}
                    theme={theme}
                  />
                  {settings.clusteringEnabled && (
                    <>
                      <SettingsSlider
                        label="Cluster Radius"
                        value={settings.clusterRadius}
                        min={10}
                        max={100}
                        step={5}
                        unit="px"
                        minLabel="More markers (10px)"
                        maxLabel="Fewer markers (100px)"
                        onChange={(val) => updateSetting('clusterRadius', val)}
                        theme={theme}
                      />
                      <SettingsSlider
                        label="Stop Clustering At Zoom"
                        value={settings.clusterMaxZoom}
                        min={10}
                        max={20}
                        step={1}
                        minLabel="Earlier (10)"
                        maxLabel="Later (20)"
                        onChange={(val) => updateSetting('clusterMaxZoom', val)}
                        theme={theme}
                      />
                    </>
                  )}
                </SettingsSection>

                {/* Display Options */}
                <SettingsSection
                  title="Display Options"
                  expanded={true}
                  onToggle={() => {}}
                  theme={theme}
                >
                  <SettingsToggle
                    label="Show Heatmap"
                    value={settings.showHeatmap}
                    description="Display photo density as a colored heat map overlay"
                    onChange={(val) => updateSetting('showHeatmap', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Maximum Zoom Level"
                    value={settings.mapMaxZoom}
                    min={10}
                    max={settings.tileMaxZoom}
                    step={1}
                    minLabel="Zoomed out (10)"
                    maxLabel={`Zoomed in (${settings.tileMaxZoom})`}
                    onChange={(val) => updateSetting('mapMaxZoom', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Map Padding"
                    value={settings.mapPadding}
                    min={20}
                    max={100}
                    step={10}
                    unit="px"
                    minLabel="Tight (20px)"
                    maxLabel="Loose (100px)"
                    onChange={(val) => updateSetting('mapPadding', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Transition Speed"
                    value={settings.mapTransitionDuration}
                    min={0}
                    max={1000}
                    step={50}
                    unit="ms"
                    minLabel="Instant (0ms)"
                    maxLabel="Slow (1000ms)"
                    onChange={(val) => updateSetting('mapTransitionDuration', val)}
                    theme={theme}
                  />
                </SettingsSection>
              </div>
            </div>
          )}

          {activeSection === 'timeline' && (
            <div>
              <div
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                    ⏱️ Timeline
                  </h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
                    Control timeline behavior and playback settings
                  </p>
                </div>
                <button
                  onClick={resetTimeline}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  title="Reset timeline settings"
                >
                  Reset
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <SettingsSection
                  title="Playback Settings"
                  expanded={true}
                  onToggle={() => {}}
                  theme={theme}
                >
                  <SettingsToggle
                    label="Auto-fit map during playback"
                    value={settings.autoZoomDuringPlay}
                    description="Map will automatically zoom and pan to follow your journey"
                    onChange={(value) => updateSetting('autoZoomDuringPlay', value)}
                    theme={theme}
                  />
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        marginBottom: '0.5rem',
                        color: colors.textPrimary,
                      }}
                    >
                      Update Frequency: {settings.timelineUpdateInterval}ms
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: colors.textMuted,
                          marginLeft: '0.5rem',
                        }}
                      >
                        ({Math.round(1000 / settings.timelineUpdateInterval)} updates/sec)
                      </span>
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={500}
                      step={50}
                      value={settings.timelineUpdateInterval}
                      onChange={(e) =>
                        updateSetting('timelineUpdateInterval', parseInt(e.target.value))
                      }
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: colors.surface,
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: colors.textMuted,
                        marginTop: '0.25rem',
                      }}
                    >
                      <span>Frequent/High CPU (50ms)</span>
                      <span>Infrequent/Low CPU (500ms)</span>
                    </div>
                  </div>
                </SettingsSection>
              </div>
            </div>
          )}

          {activeSection === 'storage' && <StorageSettings theme={theme} toast={toast} />}

          {activeSection === 'advanced' && (
            <div>
              <div
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                    🔧 Advanced Settings
                  </h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
                    Fine-tune advanced map and interaction settings
                  </p>
                </div>
                <button
                  onClick={resetAdvanced}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  title="Reset advanced settings"
                >
                  Reset
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: colors.surface,
                    borderRadius: '8px',
                    border: `1px solid ${colors.warning || colors.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: colors.textPrimary,
                      marginBottom: '0.5rem',
                    }}
                  >
                    ⚠️ Advanced Settings
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                    These settings are for development and testing. Incorrect values may cause
                    issues or poor performance.
                  </div>
                </div>

                <SettingsSection
                  title="UI Settings"
                  expanded={true}
                  onToggle={() => {}}
                  theme={theme}
                >
                  <SettingsSlider
                    label="Toast Duration"
                    value={settings.toastDuration}
                    min={1000}
                    max={10000}
                    step={500}
                    unit="ms"
                    minLabel="Quick (1s)"
                    maxLabel="Long (10s)"
                    onChange={(val) => updateSetting('toastDuration', val)}
                    theme={theme}
                  />
                </SettingsSection>

                <SettingsSection
                  title="Spider Settings"
                  expanded={true}
                  onToggle={() => {}}
                  theme={theme}
                >
                  <SettingsSlider
                    label="Spider Trigger Zoom"
                    value={settings.spiderTriggerZoom}
                    min={0}
                    max={18}
                    step={1}
                    minLabel="Always (0)"
                    maxLabel="Max zoom (18)"
                    onChange={(val) => updateSetting('spiderTriggerZoom', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Spider Overlap Tolerance"
                    value={settings.spiderOverlapTolerance}
                    min={5}
                    max={50}
                    step={5}
                    unit="px"
                    minLabel="Tight (5px)"
                    maxLabel="Loose (50px)"
                    onChange={(val) => updateSetting('spiderOverlapTolerance', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Spider Radius"
                    value={settings.spiderRadius}
                    min={30}
                    max={150}
                    step={10}
                    unit="px"
                    minLabel="Small (30px)"
                    maxLabel="Large (150px)"
                    onChange={(val) => updateSetting('spiderRadius', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Spider Animation Duration"
                    value={settings.spiderAnimationDuration}
                    min={0}
                    max={1000}
                    step={50}
                    unit="ms"
                    minLabel="Instant (0ms)"
                    maxLabel="Slow (1000ms)"
                    onChange={(val) => updateSetting('spiderAnimationDuration', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Spider Collapse Margin"
                    value={settings.spiderCollapseMargin}
                    min={10}
                    max={100}
                    step={10}
                    unit="px"
                    minLabel="Tight (10px)"
                    maxLabel="Loose (100px)"
                    onChange={(val) => updateSetting('spiderCollapseMargin', val)}
                    theme={theme}
                  />
                  <SettingsSlider
                    label="Spider Clear Zoom"
                    value={settings.spiderClearZoom}
                    min={5}
                    max={18}
                    step={1}
                    minLabel="Zoomed out (5)"
                    maxLabel="Zoomed in (18)"
                    onChange={(val) => updateSetting('spiderClearZoom', val)}
                    theme={theme}
                  />
                </SettingsSection>

                <SettingsSection
                  title="Tile Settings"
                  expanded={true}
                  onToggle={() => {}}
                  theme={theme}
                >
                  <SettingsSlider
                    label="Tile Max Zoom"
                    value={settings.tileMaxZoom}
                    min={15}
                    max={19}
                    step={1}
                    minLabel="Conservative (15)"
                    maxLabel="Maximum (19)"
                    onChange={(val) => {
                      updateSetting('tileMaxZoom', val);
                      if (settings.mapMaxZoom > val) {
                        updateSetting('mapMaxZoom', val);
                      }
                    }}
                    theme={theme}
                  />
                </SettingsSection>
              </div>
            </div>
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
