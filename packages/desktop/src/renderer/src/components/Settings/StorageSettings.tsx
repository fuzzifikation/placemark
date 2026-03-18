/**
 * StorageSettings - Database and thumbnail cache management
 */

import { useState, useEffect } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';
import { SettingsSlider } from './SettingsSlider';
import { formatNumber } from '../../utils/formatLocale';
import type { AppSettings } from '../Settings';

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
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onReset?: () => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

export function StorageSettings({
  theme,
  settings,
  onSettingChange,
  onReset,
  toast,
}: StorageSettingsProps) {
  const colors = useThemeColors(theme);
  const [thumbnailStats, setThumbnailStats] = useState<ThumbnailStats | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    advanced: false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

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

  return (
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
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Library</h3>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
            Manage your photo library and storage
          </p>
        </div>
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
              <strong>Total Photos:</strong> {formatNumber(databaseStats.totalPhotoCount)}
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
              {formatNumber(thumbnailStats.thumbnailCount)} thumbnails •{' '}
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
        </div>
      </div>

      {/* Advanced (collapsed) */}
      <SettingsSection
        title="Advanced"
        expanded={expandedSections.advanced}
        onToggle={() => toggleSection('advanced')}
        theme={theme}
        isAdvanced
      >
        <SettingsSlider
          label="Maximum File Size"
          value={settings.maxFileSizeMB}
          min={50}
          max={300}
          step={10}
          unit="MB"
          minLabel="Small (50MB)"
          maxLabel="Large (300MB)"
          description="Maximum individual file size to scan. Only relevant for very large RAW files (medium-format cameras). Default: 150 MB."
          onChange={(val) => onSettingChange('maxFileSizeMB', val)}
          theme={theme}
        />
      </SettingsSection>

      {/* Section footer */}
      {onReset && (
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <button
            onClick={onReset}
            title="Reset library settings to defaults"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '0.75rem',
              color: colors.textMuted,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
