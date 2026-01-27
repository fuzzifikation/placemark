/**
 * Settings component - configure app parameters
 */

import { useState, useEffect } from 'react';
import { type Theme, getThemeColors } from '../theme';

interface SettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  theme: Theme;
  onThemeChange: () => void;
}

export interface AppSettings {
  // Map Clustering
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
  clusterRadius: 30,
  clusterMaxZoom: 14,

  // Map Display
  mapMaxZoom: 15,
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
          <section style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>
            <h3
              onClick={() => toggleSection('clustering')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: colors.textPrimary,
              }}
            >
              <span>{expandedSections.clustering ? '▼' : '▶'}</span>
              Map Clustering
            </h3>

            {expandedSections.clustering && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Cluster Radius */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Cluster Radius
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {settings.clusterRadius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.clusterRadius}
                    onChange={(e) =>
                      setSettings({ ...settings, clusterRadius: parseInt(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#999',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>More markers (10)</span>
                    <span>Fewer markers (100)</span>
                  </div>
                </div>

                {/* Cluster Max Zoom */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Stop Clustering At Zoom
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {settings.clusterMaxZoom}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="1"
                    value={settings.clusterMaxZoom}
                    onChange={(e) =>
                      setSettings({ ...settings, clusterMaxZoom: parseInt(e.target.value) })
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
                    <span>Earlier (10)</span>
                    <span>Later (20)</span>
                  </div>
                </div>
              </div>
            )}
          </section>
          {/* Map Display */}
          <section style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>
            <h3
              onClick={() => toggleSection('display')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: colors.textPrimary,
              }}
            >
              <span>{expandedSections.display ? '▼' : '▶'}</span>
              Map Display
            </h3>

            {expandedSections.display && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Max Zoom */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Maximum Zoom Level
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {settings.mapMaxZoom}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="1"
                    value={settings.mapMaxZoom}
                    onChange={(e) =>
                      setSettings({ ...settings, mapMaxZoom: parseInt(e.target.value) })
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
                    <span>Zoomed out (10)</span>
                    <span>Zoomed in (20)</span>
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Map Padding
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {settings.mapPadding}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={settings.mapPadding}
                    onChange={(e) =>
                      setSettings({ ...settings, mapPadding: parseInt(e.target.value) })
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
                    <span>Tight (20)</span>
                    <span>Loose (100)</span>
                  </div>
                </div>

                {/* Transition Duration */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Transition Speed
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {settings.mapTransitionDuration}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={settings.mapTransitionDuration}
                    onChange={(e) =>
                      setSettings({ ...settings, mapTransitionDuration: parseInt(e.target.value) })
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
                    <span>Instant (0)</span>
                    <span>Slow (1000)</span>
                  </div>
                </div>

                {/* Show Heatmap */}
                <div style={{ marginTop: '1rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings.showHeatmap}
                      onChange={(e) => setSettings({ ...settings, showHeatmap: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    Show heatmap overlay
                  </label>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: colors.textMuted,
                      marginTop: '0.25rem',
                      marginLeft: '1.5rem',
                    }}
                  >
                    Display photo density as a colored heat map
                  </div>
                </div>
              </div>
            )}
          </section>
          {/* Timeline */}
          <section>
            <h3
              onClick={() => toggleSection('timeline')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: colors.textPrimary,
              }}
            >
              <span>{expandedSections.timeline ? '▼' : '▶'}</span>
              Timeline
            </h3>

            {expandedSections.timeline && (
              <div>
                {/* Update Interval */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Update Frequency
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {settings.timelineUpdateInterval}ms (
                      {Math.round(1000 / settings.timelineUpdateInterval)}/sec)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="50"
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

                {/* Auto Zoom During Play */}
                <div style={{ marginTop: '1rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings.autoZoomDuringPlay}
                      onChange={(e) =>
                        setSettings({ ...settings, autoZoomDuringPlay: e.target.checked })
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    Auto-fit map during playback
                  </label>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: colors.textMuted,
                      marginTop: '0.25rem',
                      marginLeft: '1.5rem',
                    }}
                  >
                    Map will follow your journey as the timeline plays
                  </div>
                </div>
              </div>
            )}
          </section>{' '}
          {/* Database Management */}
          <section style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>
            <h3
              onClick={() => toggleSection('database')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: colors.textPrimary,
              }}
            >
              <span>{expandedSections.database ? '▼' : '▶'}</span>
              Database Management
            </h3>

            {expandedSections.database && (
              <div>
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
                        <strong>Total Photos:</strong>{' '}
                        {databaseStats.totalPhotoCount.toLocaleString()}
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Photos Database:</strong> {databaseStats.photosDbSizeMB.toFixed(1)}{' '}
                        MB
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Thumbnails Database:</strong>{' '}
                        {databaseStats.thumbnailsDbSizeMB.toFixed(1)} MB
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                        <strong>Total Size:</strong>{' '}
                        {(databaseStats.photosDbSizeMB + databaseStats.thumbnailsDbSizeMB).toFixed(
                          1
                        )}{' '}
                        MB
                      </p>
                    </div>
                  </div>
                )}

                {/* Clear Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={handleClearThumbnailCache}
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
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = colors.surfaceHover)
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
                  >
                    Clear Thumbnail Cache
                  </button>
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
                </div>
              </div>
            )}
          </section>
          {/* Thumbnail Cache Management */}
          <section style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>
            <h3
              onClick={() => toggleSection('thumbnails')}
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: colors.textPrimary,
              }}
            >
              <span>{expandedSections.thumbnails ? '▼' : '▶'}</span>
              Thumbnail Cache
            </h3>

            {expandedSections.thumbnails && (
              <div>
                {/* Cache Statistics */}
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
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Cached Thumbnails:</strong> {thumbnailStats.thumbnailCount}
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Cache Size:</strong> {thumbnailStats.totalSizeMB.toFixed(1)} MB /{' '}
                        {thumbnailStats.maxSizeMB} MB
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Usage:</strong> {thumbnailStats.usagePercent.toFixed(1)}%
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div
                      style={{
                        marginTop: '0.5rem',
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
                  </div>
                )}

                {/* Max Cache Size */}
                <div style={{ marginBottom: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Maximum Cache Size
                    </label>
                    <span
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}
                    >
                      {thumbnailStats?.maxSizeMB || 500} MB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={thumbnailStats?.maxSizeMB || 500}
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
                    Thumbnails are stored at 400px with ~35KB per photo. Least recently used
                    thumbnails are automatically removed when limit is reached.
                  </p>
                </div>

                <p
                  style={{
                    fontSize: '0.75rem',
                    color: colors.textMuted,
                    margin: '0.5rem 0 0 0',
                  }}
                >
                  Note: Use Database Management section above to clear thumbnail cache.
                </p>
              </div>
            )}
          </section>{' '}
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
