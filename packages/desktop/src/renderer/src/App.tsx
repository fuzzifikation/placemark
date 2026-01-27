import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings, AppSettings } from './components/Settings';
import type { Photo } from '@placemark/core';
import { type Theme, getThemeColors } from './theme';

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
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]); // Unfiltered photos
  const [showMap, setShowMap] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true);
  const [scanProgress, setScanProgress] = useState<{
    currentFile: string;
    processed: number;
    total: number;
  } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: number; end: number } | null>(
    null
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('placemark-settings');
    return saved
      ? JSON.parse(saved)
      : { clusterRadius: 30, clusterMaxZoom: 16, mapTransitionDuration: 200 };
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('placemark-theme');
    return (saved as Theme) || 'light';
  });

  const colors = getThemeColors(theme);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('placemark-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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

  // Load photos with location on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const photosWithLocation = await window.api.photos.getWithLocation();
      setAllPhotos(photosWithLocation);
      setPhotos(photosWithLocation);

      if (photosWithLocation.length > 0) {
        setShowMap(true);

        // Load date range
        const range = await window.api.photos.getDateRange();
        if (range.minDate && range.maxDate) {
          setDateRange({ min: range.minDate, max: range.maxDate });
          setSelectedDateRange({ start: range.minDate, end: range.maxDate });
        }
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const handleScanFolder = async () => {
    setScanning(true);
    setResult(null);
    setScanProgress(null);

    // Set up progress listener
    const removeListener = window.api.photos.onScanProgress((progress) => {
      setScanProgress(progress);
    });

    try {
      const scanResult = await window.api.photos.scanFolder(includeSubdirectories);
      setResult(scanResult);

      // Reload photos after scanning
      if (!scanResult.canceled) {
        await loadPhotos();
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setResult({ error: String(error) });
    } finally {
      removeListener();
      setScanProgress(null);
      setScanning(false);
    }
  };

  const handleTimelineToggle = () => {
    setShowTimeline(!showTimeline);
  };

  const handleDateRangeChange = async (start: number, end: number) => {
    setSelectedDateRange({ start, end });
    try {
      const filtered = await window.api.photos.getWithLocationInDateRange(start, end);
      setPhotos(filtered);
    } catch (error) {
      console.error('Failed to filter photos by date:', error);
    }
  };

  const handleTimelineClose = () => {
    setShowTimeline(false);
    // Reset to show all photos
    if (dateRange) {
      setSelectedDateRange({ start: dateRange.min, end: dateRange.max });
      setPhotos(allPhotos);
    }
  };

  if (showMap && allPhotos.length > 0) {
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
              {photos.length} photos with location
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
              disabled={!dateRange}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: showTimeline ? colors.primary : colors.surface,
                color: showTimeline ? colors.buttonText : colors.textPrimary,
                border: `1px solid ${showTimeline ? colors.primary : colors.border}`,
                borderRadius: '4px',
                cursor: dateRange ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (dateRange && !showTimeline) {
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
              disabled={scanning}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: scanning ? colors.textMuted : colors.primary,
                color: colors.buttonText,
                border: 'none',
                borderRadius: '4px',
                cursor: scanning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!scanning) e.currentTarget.style.backgroundColor = colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                if (!scanning) e.currentTarget.style.backgroundColor = colors.primary;
              }}
            >
              {scanning ? 'Scanning...' : 'Scan Another Folder'}
            </button>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <MapView
              photos={photos}
              onPhotoClick={setSelectedPhoto}
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
          {showTimeline && dateRange && selectedDateRange && (
            <Timeline
              minDate={dateRange.min}
              maxDate={dateRange.max}
              startDate={selectedDateRange.start}
              endDate={selectedDateRange.end}
              totalPhotos={allPhotos.length}
              filteredPhotos={photos.length}
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
          checked={includeSubdirectories}
          onChange={(e) => setIncludeSubdirectories(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <span>Include subdirectories</span>
      </label>

      <button
        onClick={handleScanFolder}
        disabled={scanning}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: scanning ? '#ccc' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: scanning ? 'not-allowed' : 'pointer',
        }}
      >
        {scanning
          ? scanProgress
            ? `Scanning... ${scanProgress.processed}/${scanProgress.total}`
            : 'Scanning...'
          : 'Scan Folder'}
      </button>

      {scanning && scanProgress && (
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
            Processing: {scanProgress.processed} of {scanProgress.total} files
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
            Current: {scanProgress.currentFile}
          </p>
        </div>
      )}

      {result && !result.canceled && (
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
          {result.error ? (
            <p style={{ color: 'red' }}>{result.error}</p>
          ) : (
            <>
              <p>
                <strong>Folder:</strong> {result.folderPath}
              </p>
              <p>
                <strong>Total files scanned:</strong> {result.totalFiles}
              </p>
              <p>
                <strong>Photos processed:</strong> {result.processedFiles}
              </p>
              <p
                style={{
                  fontSize: '1.25rem',
                  color: '#0066cc',
                  fontWeight: 'bold',
                }}
              >
                Photos with location: {result.photosWithLocation}
              </p>
              {result.errors?.length > 0 && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer' }}>{result.errors.length} errors</summary>
                  <ul style={{ fontSize: '0.875rem', color: '#666' }}>
                    {result.errors.map((err: string, i: number) => (
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
