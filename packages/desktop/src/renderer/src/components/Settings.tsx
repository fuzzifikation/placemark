/**
 * Settings component - configure app parameters
 */

import { useState, useEffect } from 'react';
import { type Theme, getThemeColors } from '../theme';
import { SettingsSlider } from './Settings/SettingsSlider';
import { SettingsToggle } from './Settings/SettingsToggle';
import { SettingsSection } from './Settings/SettingsSection';

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  theme: Theme;
  onThemeChange: () => void;
}

export interface AppSettings {
  // Map Clustering
  clusteringEnabled: boolean; // whether clustering is enabled
  clusterRadius: number; // 10-100 pixels
  clusterMaxZoom: number; // 10-20 zoom level

  // Map Display
  mapMaxZoom: number; // 10-20 - maximum zoom when auto-fitting
  mapPadding: number; // 20-100 pixels - padding around markers
  mapTransitionDuration: number; // 0-1000 milliseconds
  showHeatmap: boolean; // whether to show heatmap overlay

  // Timeline
  timelineUpdateInterval: number; // 50-500 milliseconds - how often map updates during playback
  autoZoomDuringPlay: boolean; // whether map should auto-fit to photos during timeline playback
}

const DEFAULT_SETTINGS: AppSettings = {
  // Map Clustering
  clusteringEnabled: true,
  clusterRadius: 30,
  clusterMaxZoom: 14, // Must be < mapMaxZoom to avoid warning

  // Map Display
  mapMaxZoom: 18, // Increased to allow deeper zoom
  mapPadding: 50,
  mapTransitionDuration: 200,
  showHeatmap: false,

  // Timeline
  timelineUpdateInterval: 100,
  autoZoomDuringPlay: true,
};

export function Settings({ onClose, onSettingsChange, theme, onThemeChange }: SettingsProps) {
  const colors = getThemeColors(theme);
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('placemark-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [expandedSections, setExpandedSections] = useState<{
    clustering: boolean;
    display: boolean;
    timeline: boolean;
    thumbnails: boolean;
    database: boolean;
  }>({
    clustering: true,
    display: true,
    timeline: true,
    thumbnails: true,
    database: true,
  });

  const [thumbnailStats, setThumbnailStats] = useState<{
    totalSizeMB: number;
    thumbnailCount: number;
    maxSizeMB: number;
    usagePercent: number;
  } | null>(null);

  const [databaseStats, setDatabaseStats] = useState<{
    photosDbSizeMB: number;
    thumbnailsDbSizeMB: number;
    totalPhotoCount: number;
  } | null>(null);

  // Load stats on mount
  useEffect(() => {
    loadThumbnailStats();
    loadDatabaseStats();
  }, []);

  const loadThumbnailStats = async () => {
    try {
      const stats = await (window as any).api.thumbnails.getStats();
      setThumbnailStats(stats);
    } catch (error) {
      console.error('Failed to load thumbnail stats:', error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const stats = await (window as any).api.photos.getDatabaseStats();
      setDatabaseStats(stats);
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  };

  const handleClearThumbnailCache = async () => {
    if (!confirm('Clear thumbnail cache? Thumbnails will be regenerated as needed.')) {
      return;
    }
    try {
      await (window as any).api.thumbnails.clearCache();
      await loadThumbnailStats();
      await loadDatabaseStats();
      alert('Thumbnail cache cleared successfully.');
    } catch (error) {
      console.error('Failed to clear thumbnail cache:', error);
      alert('Failed to clear cache: ' + error);
    }
  };

  const handleClearPhotosDatabase = async () => {
    if (
      !confirm(
        'Clear all photos from database? This cannot be undone. You will need to re-scan your folders.'
      )
    ) {
      return;
    }
    try {
      await (window as any).api.photos.clearDatabase();
      await loadDatabaseStats();
      alert('Photos database cleared successfully.');
      // Notify parent to refresh UI
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear photos database:', error);
      alert('Failed to clear database: ' + error);
    }
  };

  const handleOpenAppDataFolder = async () => {
    try {
      await (window as any).api.system.openAppDataFolder();
    } catch (error) {
      console.error('Failed to open app data folder:', error);
      alert('Failed to open app data folder: ' + error);
    }
  };

  const handleSetMaxCacheSize = async (sizeMB: number) => {
    try {
      await (window as any).api.thumbnails.setMaxSize(sizeMB);
      await loadThumbnailStats();
    } catch (error) {
      console.error('Failed to set cache size:', error);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // Save to localStorage whenever settings change
    localStorage.setItem('placemark-settings', JSON.stringify(settings));
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          transition: 'background-color 0.2s ease, color 0.2s ease',
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
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
          >
            ×
          </button>
        </div>

        {/* Settings sections */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Appearance */}
          <section style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>
            <h3
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              Appearance
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label
                  style={{ fontSize: '0.875rem', color: colors.textSecondary, display: 'block' }}
                >
                  Theme
                </label>
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
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
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
              onChange={(val) => setSettings({ ...settings, clusteringEnabled: val })}
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
                  onChange={(val) => setSettings({ ...settings, clusterRadius: val })}
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
                  onChange={(val) => setSettings({ ...settings, clusterMaxZoom: val })}
                  theme={theme}
                />
              </>
            )}

            <SettingsToggle
              label="Show Heatmap"
              value={settings.showHeatmap}
              description="Display photo density as a colored heat map"
              onChange={(val) => setSettings({ ...settings, showHeatmap: val })}
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
              max={20}
              step={1}
              minLabel="Zoomed out (10)"
              maxLabel="Zoomed in (20)"
              onChange={(val) => setSettings({ ...settings, mapMaxZoom: val })}
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
              onChange={(val) => setSettings({ ...settings, mapPadding: val })}
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
              onChange={(val) => setSettings({ ...settings, mapTransitionDuration: val })}
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
                onChange={(e) =>
                  setSettings({ ...settings, timelineUpdateInterval: parseInt(e.target.value) })
                }
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
              onChange={(value) => setSettings({ ...settings, autoZoomDuringPlay: value })}
              theme={theme}
            />
          </SettingsSection>
          {/* Database Management */}
          <SettingsSection
            title="Database Management"
            expanded={expandedSections.database}
            onToggle={() => toggleSection('database')}
            theme={theme}
          >
            {/* Database Statistics */}
            {databaseStats && (
              <div
                style={{
                  backgroundColor: colors.surface,
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Total Photos:</strong> {databaseStats.totalPhotoCount.toLocaleString()}
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Photos Database:</strong> {databaseStats.photosDbSizeMB.toFixed(1)} MB
                  </p>
                </div>
              </div>
            )}

            {/* Thumbnail Cache Statistics and Settings */}
            {thumbnailStats && (
              <div
                style={{
                  backgroundColor: colors.surface,
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Thumbnail Cache</p>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Cached Thumbnails:</strong> {thumbnailStats.thumbnailCount}
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Cache Size:</strong> {thumbnailStats.totalSizeMB.toFixed(1)} MB /{' '}
                    {thumbnailStats.maxSizeMB} MB ({thumbnailStats.usagePercent.toFixed(1)}%)
                  </p>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    marginTop: '0.75rem',
                    height: '8px',
                    backgroundColor: colors.border,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(thumbnailStats.usagePercent, 100)}%`,
                      backgroundColor:
                        thumbnailStats.usagePercent > 90
                          ? '#f28cb1'
                          : thumbnailStats.usagePercent > 75
                            ? '#f1f075'
                            : '#51bbd6',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Max Cache Size Slider */}
                <div style={{ marginTop: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Maximum Size
                    </label>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      {thumbnailStats.maxSizeMB} MB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={thumbnailStats.maxSizeMB}
                    onChange={(e) => handleSetMaxCacheSize(parseInt(e.target.value))}
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
                    <span>100 MB (~2.8K photos)</span>
                    <span>2000 MB (~57K photos)</span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: colors.textMuted,
                      margin: '0.5rem 0 0 0',
                    }}
                  >
                    Thumbnails stored at 400px (~35KB each). Least recently used thumbnails are
                    automatically removed when limit is reached.
                  </p>
                </div>

                {/* Clear Thumbnail Cache button */}
                <button
                  onClick={handleClearThumbnailCache}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.surfaceHover)
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
                >
                  Clear Thumbnail Cache
                </button>
              </div>
            )}

            {/* Clear All Photos Button */}
            <button
              onClick={handleClearPhotosDatabase}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: colors.error,
                color: colors.buttonText,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Clear All Photos (Reset Database)
            </button>

            {/* Open Data Folder Button */}
            <button
              onClick={handleOpenAppDataFolder}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
            >
              Open Data Folder
            </button>
          </SettingsSection>

          {/* About & Legal */}
          <SettingsSection
            title="About & Legal"
            expanded={true}
            onToggle={() => {}}
            theme={theme}
          >
            <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong style={{ color: colors.textPrimary }}>Placemark</strong> v0.2.0
              </p>
              <p style={{ margin: '0 0 1rem 0' }}>
                Privacy-first, local-first photo organizer.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    (window as any).api.system.openExternal('https://github.com/placemark/placemark');
                  }}
                  style={{ color: colors.primary, textDecoration: 'none', cursor: 'pointer' }}
                >
                  GitHub
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    (window as any).api.system.openExternal('https://github.com/placemark/placemark/blob/main/LICENSE');
                  }}
                  style={{ color: colors.primary, textDecoration: 'none', cursor: 'pointer' }}
                >
                  License (MIT)
                </a>
              </div>
            </div>
          </SettingsSection>
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
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
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
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
