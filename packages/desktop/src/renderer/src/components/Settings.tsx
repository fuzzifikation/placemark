/**
 * Settings component - configure app parameters
 * Refactored to use sub-components for maintainability
 */

import { useState, useEffect } from 'react';
import { type Theme, getThemeColors } from '../theme';
import { SettingsSlider } from './Settings/SettingsSlider';
import { SettingsToggle } from './Settings/SettingsToggle';
import { SettingsSection } from './Settings/SettingsSection';
import { StorageSettings } from './Settings/StorageSettings';
import { AboutSection } from './Settings/AboutSection';

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

export function Settings({ onClose, onSettingsChange, theme, onThemeChange, toast }: SettingsProps) {
  const colors = getThemeColors(theme);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('placemark-settings');
    if (saved) {
      return migrateSettings(JSON.parse(saved));
    }
    return DEFAULT_SETTINGS;
  });

  const [expandedSections, setExpandedSections] = useState({
    clustering: true,
    display: true,
    timeline: true,
    database: true,
    devSettings: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // Save settings with version for future migrations
    localStorage.setItem(
      'placemark-settings',
      JSON.stringify({ ...settings, _version: SETTINGS_VERSION })
    );
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleReset = () => setSettings(DEFAULT_SETTINGS);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.modalBackground,
          color: colors.textPrimary,
          borderRadius: '8px',
          padding: '1.5rem',
          minWidth: '400px',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: colors.textSecondary,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Appearance */}
          <section style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Appearance</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>Theme</label>
                <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '0.25rem' }}>
                  Switch between light and dark mode
                </div>
              </div>
              <button
                onClick={onThemeChange}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1.25rem',
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </section>

          {/* Map Clustering */}
          <SettingsSection
            title="Map Clustering"
            expanded={expandedSections.clustering}
            onToggle={() => toggleSection('clustering')}
            theme={theme}
          >
            <SettingsToggle
              label="Enable marker clustering"
              value={settings.clusteringEnabled}
              description="Group nearby photos into clusters to improve performance"
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
                  minLabel="More markers (10)"
                  maxLabel="Fewer markers (100)"
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
            <SettingsToggle
              label="Show Heatmap"
              value={settings.showHeatmap}
              description="Display photo density as a colored heat map"
              onChange={(val) => updateSetting('showHeatmap', val)}
              theme={theme}
            />
          </SettingsSection>

          {/* Map Display */}
          <SettingsSection
            title="Map Display"
            expanded={expandedSections.display}
            onToggle={() => toggleSection('display')}
            theme={theme}
          >
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
              minLabel="Tight (20)"
              maxLabel="Loose (100)"
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
              minLabel="Instant (0)"
              maxLabel="Slow (1000)"
              onChange={(val) => updateSetting('mapTransitionDuration', val)}
              theme={theme}
            />
          </SettingsSection>

          {/* Timeline */}
          <SettingsSection
            title="Timeline"
            expanded={expandedSections.timeline}
            onToggle={() => toggleSection('timeline')}
            theme={theme}
          >
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: colors.textPrimary,
                }}
              >
                Update Frequency:{' '}
                <strong>
                  {settings.timelineUpdateInterval}ms (
                  {Math.round(1000 / settings.timelineUpdateInterval)}/sec)
                </strong>
              </label>
              <input
                type="range"
                min={50}
                max={500}
                step={50}
                value={settings.timelineUpdateInterval}
                onChange={(e) => updateSetting('timelineUpdateInterval', parseInt(e.target.value))}
                style={{ width: '100%' }}
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
                <span>Frequent/High CPU (50)</span>
                <span>Infrequent/Low CPU (500)</span>
              </div>
            </div>
            <SettingsToggle
              label="Auto-fit map during playback"
              value={settings.autoZoomDuringPlay}
              description="Map will follow your journey as the timeline plays"
              onChange={(value) => updateSetting('autoZoomDuringPlay', value)}
              theme={theme}
            />
          </SettingsSection>

          {/* Database Management */}
          <StorageSettings
            theme={theme}
            expanded={expandedSections.database}
            onToggle={() => toggleSection('database')}
            toast={toast}
          />

          {/* Developer Settings */}
          <SettingsSection
            title="🔧 Developer Settings"
            expanded={expandedSections.devSettings}
            onToggle={() => toggleSection('devSettings')}
            theme={theme}
          >
            <SettingsToggle
              label="Enable Developer Settings"
              value={settings.devSettingsEnabled}
              description="Show advanced fine-tuning options (for development only)"
              onChange={(val) => updateSetting('devSettingsEnabled', val)}
              theme={theme}
            />
            {settings.devSettingsEnabled && (
              <>
                <div
                  style={{
                    padding: '0.5rem',
                    marginBottom: '1rem',
                    backgroundColor: colors.surface,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: colors.textMuted,
                  }}
                >
                  ⚠️ These settings are for development and testing. Incorrect values may cause
                  issues.
                </div>

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
                    // Also cap mapMaxZoom if it exceeds the new limit
                    if (settings.mapMaxZoom > val) {
                      updateSetting('mapMaxZoom', val);
                    }
                  }}
                  theme={theme}
                />

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
                  label="Spider Animation"
                  value={settings.spiderAnimationDuration}
                  min={0}
                  max={1000}
                  step={50}
                  unit="ms"
                  minLabel="Instant (0)"
                  maxLabel="Slow (1000)"
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
              </>
            )}
          </SettingsSection>

          {/* About & Legal */}
          <AboutSection theme={theme} />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={handleReset}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: colors.surface,
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.875rem',
              backgroundColor: colors.primary,
              color: colors.buttonText,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
