import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings, AppSettings } from './components/Settings';
import type { Photo } from '@placemark/core';
import { usePhotoData } from './hooks/usePhotoData';
import { useTheme } from './hooks/useTheme';
import { useFolderScan } from './hooks/useFolderScan';

declare global {
  interface Window {
    api: {
      photos: {
        scanFolder: (includeSubdirectories: boolean) => Promise<any>;
        getWithLocation: () => Promise<Photo[]>;
        getWithLocationInDateRange: (
          startTimestamp: number | null,
          endTimestamp: number | null
        ) => Promise<Photo[]>;
        getDateRange: () => Promise<{ minDate: number | null; maxDate: number | null }>;
        getCountWithLocation: () => Promise<number>;
        openInViewer: (path: string) => Promise<void>;
        showInFolder: (path: string) => Promise<void>;
        getDatabaseStats: () => Promise<{
          photosDbSizeMB: number;
          thumbnailsDbSizeMB: number;
          totalPhotoCount: number;
        }>;
        clearDatabase: () => Promise<void>;
        onScanProgress: (callback: (progress: any) => void) => () => void;
      };
      thumbnails: {
        get: (photoId: number, photoPath: string) => Promise<Buffer | null>;
        getStats: () => Promise<{
          totalSizeBytes: number;
          totalSizeMB: number;
          thumbnailCount: number;
          maxSizeMB: number;
          usagePercent: number;
        }>;
        clearCache: () => Promise<void>;
        setMaxSize: (sizeMB: number) => Promise<void>;
      };
    };
  }
}

function App() {
  // Custom hooks
  const photoData = usePhotoData();
  const { theme, colors, toggleTheme } = useTheme();
  const folderScan = useFolderScan();

  // Component state
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('placemark-settings');
    return saved
      ? JSON.parse(saved)
      : { clusterRadius: 30, clusterMaxZoom: 16, mapTransitionDuration: 200 };
  });

  // Load thumbnail when photo is selected
  useEffect(() => {
    if (selectedPhoto) {
      setLoadingThumbnail(true);
      setThumbnailUrl(null);

      window.api.thumbnails
        .get(selectedPhoto.id, selectedPhoto.path)
        .then((thumbnailBuffer) => {
          if (thumbnailBuffer) {
            // Convert Buffer to Blob and create URL
            // Cast through unknown to handle Buffer type from IPC
            const uint8Array = new Uint8Array(thumbnailBuffer as unknown as ArrayBuffer);
            const blob = new Blob([uint8Array], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
          }
        })
        .catch((error) => {
          console.error('Failed to load thumbnail:', error);
        })
        .finally(() => {
          setLoadingThumbnail(false);
        });

      // Cleanup URL on unmount or photo change
      return () => {
        if (thumbnailUrl) {
          URL.revokeObjectURL(thumbnailUrl);
        }
      };
    }
  }, [selectedPhoto]);

  const handleScanFolder = async () => {
    await folderScan.scanFolder(photoData.loadPhotos);
  };

  const handleTimelineToggle = () => {
    setShowTimeline(!showTimeline);
  };

  const handleDateRangeChange = async (start: number, end: number) => {
    await photoData.filterByDateRange(start, end);
  };

  const handleTimelineClose = () => {
    setShowTimeline(false);
    photoData.resetDateFilter();
  };

  if (photoData.showMap && photoData.allPhotos.length > 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: colors.background,
          color: colors.textPrimary,
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: colors.textPrimary }}>Placemark</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
              {photoData.photos.length} photos with location
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{
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
              ⚙️ Settings
            </button>
            <button
              onClick={handleTimelineToggle}
              disabled={!photoData.dateRange}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: showTimeline ? colors.primary : colors.surface,
                color: showTimeline ? colors.buttonText : colors.textPrimary,
                border: `1px solid ${showTimeline ? colors.primary : colors.border}`,
                borderRadius: '4px',
                cursor: photoData.dateRange ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (photoData.dateRange && !showTimeline) {
                  e.currentTarget.style.backgroundColor = colors.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!showTimeline) {
                  e.currentTarget.style.backgroundColor = colors.surface;
                }
              }}
            >
              📅 Timeline
            </button>
            <button
              onClick={handleScanFolder}
              disabled={folderScan.scanning}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: folderScan.scanning ? colors.textMuted : colors.primary,
                color: colors.buttonText,
                border: 'none',
                borderRadius: '4px',
                cursor: folderScan.scanning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!folderScan.scanning)
                  e.currentTarget.style.backgroundColor = colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                if (!folderScan.scanning) e.currentTarget.style.backgroundColor = colors.primary;
              }}
            >
              {folderScan.scanning ? 'Scanning...' : 'Scan Another Folder'}
            </button>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <MapView
              photos={photoData.photos}
              onPhotoClick={setSelectedPhoto}
              clusteringEnabled={settings.clusteringEnabled}
              clusterRadius={settings.clusterRadius}
              clusterMaxZoom={settings.clusterMaxZoom}
              transitionDuration={settings.mapTransitionDuration}
              maxZoom={settings.mapMaxZoom}
              padding={settings.mapPadding}
              autoFit={showTimeline ? settings.autoZoomDuringPlay : true}
              theme={theme}
              showHeatmap={settings.showHeatmap}
            />
          </div>
          {showTimeline && photoData.dateRange && photoData.selectedDateRange && (
            <Timeline
              minDate={photoData.dateRange.min}
              maxDate={photoData.dateRange.max}
              startDate={photoData.selectedDateRange.start}
              endDate={photoData.selectedDateRange.end}
              totalPhotos={photoData.allPhotos.length}
              filteredPhotos={photoData.photos.length}
              onRangeChange={handleDateRangeChange}
              onClose={handleTimelineClose}
              updateInterval={settings.timelineUpdateInterval}
              theme={theme}
            />
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            onSettingsChange={setSettings}
            theme={theme}
            onThemeChange={toggleTheme}
          />
        )}

        {/* Photo Preview Modal */}
        {selectedPhoto && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1rem',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}
              >
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                  {selectedPhoto.path.split(/[\\/]/).pop()}
                </h3>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '0 0.5rem',
                  }}
                >
                  ×
                </button>
              </div>
              {/* Thumbnail Display */}
              {loadingThumbnail && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                  }}
                >
                  <p style={{ color: '#666' }}>Loading thumbnail...</p>
                </div>
              )}
              {!loadingThumbnail && thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt={selectedPhoto.path.split(/[\\/]/).pop()}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: '4px',
                  }}
                />
              )}
              {!loadingThumbnail && !thumbnailUrl && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                  }}
                >
                  <p style={{ color: '#666' }}>Thumbnail not available</p>
                </div>
              )}
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Path:</strong> {selectedPhoto.path}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Location:</strong> {selectedPhoto.latitude?.toFixed(6)},{' '}
                  {selectedPhoto.longitude?.toFixed(6)}
                </p>
                {selectedPhoto.timestamp && (
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Date:</strong> {new Date(selectedPhoto.timestamp).toLocaleString()}
                  </p>
                )}
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Size:</strong> {(selectedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div
                style={{
                  marginTop: '1rem',
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => window.api.photos.openInViewer(selectedPhoto.path)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Open in Viewer
                </button>
                <button
                  onClick={() => window.api.photos.showInFolder(selectedPhoto.path)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Show in Folder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
      }}
    >
      <h1>Placemark</h1>
      <p style={{ color: '#666' }}>Privacy-first, local-first photo organizer</p>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={folderScan.includeSubdirectories}
          onChange={(e) => folderScan.setIncludeSubdirectories(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <span>Include subdirectories</span>
      </label>

      <button
        onClick={handleScanFolder}
        disabled={folderScan.scanning}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: folderScan.scanning ? '#ccc' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: folderScan.scanning ? 'not-allowed' : 'pointer',
        }}
      >
        {folderScan.scanning
          ? folderScan.scanProgress
            ? `Scanning... ${folderScan.scanProgress.processed}/${folderScan.scanProgress.total}`
            : 'Scanning...'
          : 'Scan Folder'}
      </button>

      {folderScan.scanning && folderScan.scanProgress && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            fontSize: '0.875rem',
          }}
        >
          <p style={{ margin: '0.25rem 0', color: '#666' }}>
            Processing: {folderScan.scanProgress.processed} of {folderScan.scanProgress.total} files
          </p>
          <p
            style={{
              margin: '0.25rem 0',
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Current: {folderScan.scanProgress.currentFile}
          </p>
        </div>
      )}

      {folderScan.result && !folderScan.result.canceled && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Scan Results</h3>
          {folderScan.result.error ? (
            <p style={{ color: 'red' }}>{folderScan.result.error}</p>
          ) : (
            <>
              <p>
                <strong>Folder:</strong> {folderScan.result.folderPath}
              </p>
              <p>
                <strong>Total files scanned:</strong> {folderScan.result.totalFiles}
              </p>
              <p>
                <strong>Photos processed:</strong> {folderScan.result.processedFiles}
              </p>
              <p
                style={{
                  fontSize: '1.25rem',
                  color: '#0066cc',
                  fontWeight: 'bold',
                }}
              >
                Photos with location: {folderScan.result.photosWithLocation}
              </p>
              {folderScan.result.errors?.length > 0 && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer' }}>
                    {folderScan.result.errors.length} errors
                  </summary>
                  <ul style={{ fontSize: '0.875rem', color: '#666' }}>
                    {folderScan.result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
