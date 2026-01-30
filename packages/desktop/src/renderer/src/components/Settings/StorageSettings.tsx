/**
 * StorageSettings - Database and thumbnail cache management
 */

import { useState, useEffect } from 'react';
import { type Theme, getThemeColors } from '../../theme';
import { SettingsSection } from './SettingsSection';

interface ThumbnailStats {
  totalSizeMB: number;
  thumbnailCount: number;
  maxSizeMB: number;
  usagePercent: number;
}

interface DatabaseStats {
  photosDbSizeMB: number;
  thumbnailsDbSizeMB: number;
  totalPhotoCount: number;
}

interface StorageSettingsProps {
  theme: Theme;
  expanded: boolean;
  onToggle: () => void;
}

export function StorageSettings({ theme, expanded, onToggle }: StorageSettingsProps) {
  const colors = getThemeColors(theme);
  const [thumbnailStats, setThumbnailStats] = useState<ThumbnailStats | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);

  useEffect(() => {
    loadThumbnailStats();
    loadDatabaseStats();
  }, []);

  const loadThumbnailStats = async () => {
    try {
      const stats = await window.api.thumbnails.getStats();
      setThumbnailStats(stats);
    } catch (error) {
      console.error('Failed to load thumbnail stats:', error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const stats = await window.api.photos.getDatabaseStats();
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
      await window.api.thumbnails.clearCache();
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
      await window.api.photos.clearDatabase();
      await loadDatabaseStats();
      alert('Photos database cleared successfully.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear photos database:', error);
      alert('Failed to clear database: ' + error);
    }
  };

  const handleOpenAppDataFolder = async () => {
    try {
      await window.api.system.openAppDataFolder();
    } catch (error) {
      console.error('Failed to open app data folder:', error);
      alert('Failed to open app data folder: ' + error);
    }
  };

  const handleSetMaxCacheSize = async (sizeMB: number) => {
    try {
      await window.api.thumbnails.setMaxSize(sizeMB);
      await loadThumbnailStats();
    } catch (error) {
      console.error('Failed to set cache size:', error);
    }
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  return (
    <SettingsSection
      title="Database Management"
      expanded={expanded}
      onToggle={onToggle}
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
            style={{ ...buttonStyle, marginTop: '1rem', width: '100%' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
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
          ...buttonStyle,
          backgroundColor: colors.error,
          color: colors.buttonText,
          border: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Clear All Photos (Reset Database)
      </button>

      {/* Open Data Folder Button */}
      <button
        onClick={handleOpenAppDataFolder}
        style={{ ...buttonStyle, marginTop: '1rem' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
      >
        Open Data Folder
      </button>
    </SettingsSection>
  );
}
