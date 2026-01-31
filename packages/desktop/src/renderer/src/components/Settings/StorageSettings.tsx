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
  expanded?: boolean;
  onToggle?: () => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

export function StorageSettings({ theme, expanded, onToggle, toast }: StorageSettingsProps) {
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
      toast.success('Thumbnail cache cleared successfully.');
    } catch (error) {
      console.error('Failed to clear thumbnail cache:', error);
      toast.error('Failed to clear cache: ' + error);
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
      toast.success('Photos database cleared successfully.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear photos database:', error);
      toast.error('Failed to clear database: ' + error);
    }
  };

  const handleOpenAppDataFolder = async () => {
    try {
      await window.api.system.openAppDataFolder();
    } catch (error) {
      console.error('Failed to open app data folder:', error);
      toast.error('Failed to open app data folder: ' + error);
    }
  };

  const handleSetMaxCacheSize = async (sizeMB: number) => {
    try {
      await window.api.thumbnails.setMaxSize(sizeMB);
      await loadThumbnailStats();
      toast.success(`Cache size limit set to ${sizeMB} MB`);
    } catch (error) {
      toast.error('Failed to set cache size limit');
    }
  };

  const handleResetCacheSize = async () => {
    try {
      await window.api.thumbnails.setMaxSize(500); // Default 500 MB
      await loadThumbnailStats();
      toast.success('Cache size limit reset to 500 MB');
    } catch (error) {
      toast.error('Failed to reset cache size limit');
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

  // If expanded/onToggle are provided, wrap in SettingsSection (legacy mode)
  if (expanded !== undefined && onToggle) {
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

  // Otherwise, render directly with section header (new design)
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
          💾 Storage
        </h3>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
          Manage database and thumbnail cache settings
        </p>
      </div>

      {/* Database Statistics */}
      {databaseStats && (
        <div
          style={{
            backgroundColor: colors.surface,
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
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
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Thumbnails Database:</strong> {databaseStats.thumbnailsDbSizeMB.toFixed(1)} MB
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
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.textPrimary }}>
              Thumbnail Cache
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.25rem' }}>
              {thumbnailStats.thumbnailCount.toLocaleString()} thumbnails •{' '}
              {thumbnailStats.totalSizeMB.toFixed(1)} MB used
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: colors.textPrimary,
                }}
              >
                Cache Size Limit: {thumbnailStats.maxSizeMB} MB
              </label>
              <button
                onClick={handleResetCacheSize}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: colors.surface,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="Reset cache size to 500 MB"
              >
                Reset
              </button>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={thumbnailStats.maxSizeMB}
              onChange={(e) => handleSetMaxCacheSize(parseInt(e.target.value))}
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
              <span>100 MB</span>
              <span>2000 MB</span>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors.surface,
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: `${thumbnailStats.usagePercent}%`,
                height: '100%',
                backgroundColor:
                  thumbnailStats.usagePercent > 90
                    ? colors.error
                    : thumbnailStats.usagePercent > 75
                      ? colors.warning
                      : colors.success,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleClearThumbnailCache}
              style={{
                ...buttonStyle,
                backgroundColor: colors.error,
                color: 'white',
                border: 'none',
              }}
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}

      {/* Database Management Actions */}
      <div
        style={{
          backgroundColor: colors.surface,
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.textPrimary,
            marginBottom: '1rem',
          }}
        >
          Database Management
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={handleOpenAppDataFolder} style={buttonStyle}>
            Open App Data Folder
          </button>
          <button
            onClick={handleClearPhotosDatabase}
            style={{
              ...buttonStyle,
              backgroundColor: colors.error,
              color: 'white',
              border: 'none',
            }}
          >
            Clear Photos Database
          </button>
        </div>
      </div>
    </div>
  );
}
