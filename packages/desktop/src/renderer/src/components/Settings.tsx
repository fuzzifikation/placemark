/**
 * Settings component - configure app parameters
 * Redesigned with sidebar navigation, search, and better organization
 *
 * ⚠️ SINGLE SOURCE OF TRUTH FOR DEFAULTS ⚠️
 * All default configuration values are defined in DEFAULT_SETTINGS below.
 * Other components MUST import and use these values - never define their own defaults.
 * This ensures consistency and eliminates duplicate configuration maintenance.
 */

import { useState } from 'react';
import { type Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { StorageSettings } from './Settings/StorageSettings';
import { AboutSection } from './Settings/AboutSection';
import { AppearanceSettings } from './Settings/AppearanceSettings';
import { MapDisplaySettings } from './Settings/MapDisplaySettings';
import { PlacemarksSettings } from './Settings/PlacemarksSettings';
import { AccountsSettings } from './Settings/AccountsSettings';
import { FONT_FAMILY } from '../constants/ui';
import { Palette, Database, Map as MapIcon, Info, X, Bookmark, Cloud } from 'lucide-react';
import type { SpiderSettings } from './MapView';

interface SettingsProps {
  onClose: () => void;
  settings: AppSettings;
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
  clusterOpacity: number; // Opacity for cluster circles (0-1)
  unclusteredPointOpacity: number; // Opacity for individual photo points (0-1)
  // Map Display
  mapPadding: number;
  mapTransitionDuration: number;
  showHeatmap: boolean;
  // Timeline
  timelineUpdateInterval: number;
  autoZoomDuringPlay: boolean;
  playSpeedSlowDays: number; // ▶ days advanced per second of real time
  playSpeedMediumDays: number; // ▶▶
  playSpeedFastDays: number; // ▶▶▶
  // UI Settings
  toastDuration: number; // ms - how long toasts stay visible
  singleClickOpensViewer: boolean; // skip in-app preview and open OS photo viewer on pin click
  // Scanning Settings
  maxFileSizeMB: number; // Maximum file size in MB for photo scanning (prevents memory issues with huge files)
  // Developer Settings (fine-tuning)
  devSettingsEnabled: boolean;
  tileMaxZoom: number; // Absolute max zoom limit for manual zooming (map tile availability limit)
  spiderOverlapTolerance: number; // Pixels - how close points must be visually to overlap
  spiderRadius: number; // Pixels - visual radius of spider circle on screen
  spiderAnimationDuration: number; // ms - spider expand/collapse animation
  spiderTriggerZoom: number; // Zoom level at which clusters spider instead of zoom
  spiderCollapseMargin: number; // Pixels - how far mouse can leave spider before it closes
  spiderClearZoom: number; // Auto-clear spider when zooming below this level
  // Glassmorphism UI Effects
  glassBlur: number; // Backdrop blur in pixels (0-30)
  glassSurfaceOpacity: number; // Glass surface opacity 0-100 (%)
  // Privacy
  reverseGeocodeEnabled: boolean; // Allow network calls to Nominatim to label saved placemarks
}

// SINGLE SOURCE OF TRUTH: All default values are defined here
// Other components should import and use these defaults, never define their own
export const DEFAULT_SETTINGS: AppSettings = {
  clusteringEnabled: true,
  clusterRadius: 30,
  clusterMaxZoom: 14,
  clusterOpacity: 0.65,
  unclusteredPointOpacity: 0.75,
  mapPadding: 50,
  mapTransitionDuration: 200,
  showHeatmap: false,
  timelineUpdateInterval: 100,
  autoZoomDuringPlay: true,
  playSpeedSlowDays: 7,
  playSpeedMediumDays: 30,
  playSpeedFastDays: 180,
  // UI defaults
  toastDuration: 3000, // 3 seconds
  singleClickOpensViewer: false,
  // Scanning defaults
  maxFileSizeMB: 150, // 150MB - accommodates professional RAW files (medium format cameras)
  // Developer defaults
  devSettingsEnabled: false,
  tileMaxZoom: 18, // OSM tiles work up to 19, but 18 is safer
  spiderOverlapTolerance: 20, // pixels - roughly size of a photo dot
  spiderRadius: 60, // pixels - visual radius of spider circle on screen
  spiderAnimationDuration: 300,
  spiderTriggerZoom: 6,
  spiderCollapseMargin: 30, // pixels - mouse distance beyond spider before collapse
  spiderClearZoom: 7, // auto-clear spider when zooming below this
  // Glassmorphism defaults
  glassBlur: 5, // 5px blur
  glassSurfaceOpacity: 30, // 30% opacity
  // Privacy defaults
  reverseGeocodeEnabled: false, // opt-in, not opt-out
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

export function Settings({
  onClose,
  settings,
  onSettingsChange,
  theme,
  onThemeChange,
  toast,
}: SettingsProps) {
  const colors = useThemeColors(theme);
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'map', label: 'Map', icon: <MapIcon size={16} /> },
    { id: 'placemarks', label: 'Placemarks', icon: <Bookmark size={16} /> },
    { id: 'library', label: 'Library', icon: <Database size={16} /> },
    { id: 'accounts', label: 'Accounts', icon: <Cloud size={16} /> },
  ];

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const resetAllSettings = () => {
    if (theme !== 'light') onThemeChange();
    onSettingsChange(DEFAULT_SETTINGS);
    toast.success('All settings reset to defaults');
  };

  const resetGeneral = () => {
    if (theme !== 'light') onThemeChange();
    onSettingsChange({
      ...settings,
      devSettingsEnabled: DEFAULT_SETTINGS.devSettingsEnabled,
      glassBlur: DEFAULT_SETTINGS.glassBlur,
      glassSurfaceOpacity: DEFAULT_SETTINGS.glassSurfaceOpacity,
      toastDuration: DEFAULT_SETTINGS.toastDuration,
      singleClickOpensViewer: DEFAULT_SETTINGS.singleClickOpensViewer,
    });
    toast.success('Appearance settings reset');
  };

  const resetLibrary = () => {
    onSettingsChange({
      ...settings,
      maxFileSizeMB: DEFAULT_SETTINGS.maxFileSizeMB,
    });
    toast.success('Library settings reset');
  };

  const resetPlacemarks = () => {
    onSettingsChange({
      ...settings,
      reverseGeocodeEnabled: DEFAULT_SETTINGS.reverseGeocodeEnabled,
      autoZoomDuringPlay: DEFAULT_SETTINGS.autoZoomDuringPlay,
      timelineUpdateInterval: DEFAULT_SETTINGS.timelineUpdateInterval,
      playSpeedSlowDays: DEFAULT_SETTINGS.playSpeedSlowDays,
      playSpeedMediumDays: DEFAULT_SETTINGS.playSpeedMediumDays,
      playSpeedFastDays: DEFAULT_SETTINGS.playSpeedFastDays,
    });
    toast.success('Placemarks settings reset');
  };

  const resetMap = () => {
    onSettingsChange({
      ...settings,
      clusteringEnabled: DEFAULT_SETTINGS.clusteringEnabled,
      clusterRadius: DEFAULT_SETTINGS.clusterRadius,
      clusterMaxZoom: DEFAULT_SETTINGS.clusterMaxZoom,
      clusterOpacity: DEFAULT_SETTINGS.clusterOpacity,
      unclusteredPointOpacity: DEFAULT_SETTINGS.unclusteredPointOpacity,
      mapPadding: DEFAULT_SETTINGS.mapPadding,
      mapTransitionDuration: DEFAULT_SETTINGS.mapTransitionDuration,
      showHeatmap: DEFAULT_SETTINGS.showHeatmap,
      tileMaxZoom: DEFAULT_SETTINGS.tileMaxZoom,
      spiderOverlapTolerance: DEFAULT_SETTINGS.spiderOverlapTolerance,
      spiderRadius: DEFAULT_SETTINGS.spiderRadius,
      spiderAnimationDuration: DEFAULT_SETTINGS.spiderAnimationDuration,
      spiderTriggerZoom: DEFAULT_SETTINGS.spiderTriggerZoom,
      spiderCollapseMargin: DEFAULT_SETTINGS.spiderCollapseMargin,
      spiderClearZoom: DEFAULT_SETTINGS.spiderClearZoom,
    });
    toast.success('Map settings reset');
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
          position: 'relative',
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
        {/* Close button — top-right corner of modal */}
        <button
          onClick={onClose}
          title="Close settings"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
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
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.5rem 0.5rem 0' }}>
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
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>

          {/* Footer with Reset All and About */}
          <div
            style={{
              padding: '1rem',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <button
              onClick={() => setActiveSection('about')}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.75rem',
                backgroundColor: activeSection === 'about' ? colors.primary : colors.surface,
                color: activeSection === 'about' ? colors.buttonText : colors.textSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
              title="About Placemark"
            >
              <Info size={12} /> About Placemark
            </button>
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
          {activeSection === 'general' && (
            <AppearanceSettings
              theme={theme}
              settings={settings}
              onSettingChange={updateSetting}
              onThemeChange={onThemeChange}
              onReset={resetGeneral}
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

          {activeSection === 'placemarks' && (
            <PlacemarksSettings
              theme={theme}
              settings={settings}
              onSettingChange={updateSetting}
              onReset={resetPlacemarks}
            />
          )}

          {activeSection === 'library' && (
            <StorageSettings
              theme={theme}
              settings={settings}
              onSettingChange={updateSetting}
              onReset={resetLibrary}
              toast={toast}
            />
          )}

          {activeSection === 'accounts' && <AccountsSettings theme={theme} toast={toast} />}

          {activeSection === 'about' && <AboutSection theme={theme} />}
        </div>
      </div>
    </div>
  );
}
