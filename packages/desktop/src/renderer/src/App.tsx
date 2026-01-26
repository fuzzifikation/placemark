import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings, AppSettings } from './components/Settings';
import type { Photo } from '@placemark/core';

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
        clearDatabase: () => Promise<void>;
        onScanProgress: (callback: (progress: any) => void) => () => void;
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

  const handleClearDatabase = async () => {
    if (!confirm('Clear all photos from database? This cannot be undone.')) {
      return;
    }

    try {
      await window.api.photos.clearDatabase();
      setPhotos([]);
      setAllPhotos([]);
      setShowMap(false);
      setResult(null);
      setShowTimeline(false);
      setDateRange(null);
      setSelectedDateRange(null);
    } catch (error) {
      console.error('Failed to clear database:', error);
      alert('Failed to clear database: ' + error);
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

  if (showMap && photos.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Header */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fff',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Placemark</h1>
            <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>
              {photos.length} photos with location
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleTimelineToggle}
              disabled={!dateRange}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: showTimeline ? '#0066cc' : '#fff',
                color: showTimeline ? 'white' : '#333',
                border: '1px solid #0066cc',
                borderRadius: '4px',
                cursor: dateRange ? 'pointer' : 'not-allowed',
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
                backgroundColor: scanning ? '#ccc' : '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: scanning ? 'not-allowed' : 'pointer',
              }}
            >
              {scanning ? 'Scanning...' : 'Scan Another Folder'}
            </button>
            <button
              onClick={handleClearDatabase}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear Database
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
            />
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} onSettingsChange={setSettings} />
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
                    <strong>Date:</strong>{' '}
                    {new Date(selectedPhoto.timestamp * 1000).toLocaleString()}
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
