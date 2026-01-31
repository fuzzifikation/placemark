import { useState, useEffect, useMemo } from 'react';
import { MapView, SelectionMode } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings, AppSettings } from './components/Settings';
import { OperationsPanel } from './components/Operations/OperationsPanel';
import { FloatingHeader } from './components/FloatingHeader';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import type { Photo } from '@placemark/core';
import { usePhotoData } from './hooks/usePhotoData';
import { useTheme } from './hooks/useTheme';
import { useFolderScan } from './hooks/useFolderScan';
import { useToast } from './hooks/useToast';
import { FONT_FAMILY } from './constants/ui';
import { ToastContainer } from './components/Toast/ToastContainer';
import './types/preload.d'; // Import type definitions

function App() {
  // Global styles to remove default margins and scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Custom hooks
  const photoData = usePhotoData();
  const { theme, colors, toggleTheme } = useTheme();
  const folderScan = useFolderScan();
  const toast = useToast();

  // Component state
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [lastSelectedDateRange, setLastSelectedDateRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('placemark-settings');
    return saved
      ? JSON.parse(saved)
      : {
          clusterRadius: 30,
          clusterMaxZoom: 14,
          mapTransitionDuration: 200,
          autoZoomDuringPlay: true,
          timelineUpdateInterval: 100,
        };
  });

  const [selectionMode, setSelectionMode] = useState<SelectionMode>('pan');

  const handleSelectionModeToggle = () => {
    if (selectionMode === 'lasso') {
      setSelectionMode('pan');
      photoData.clearSelection();
    } else {
      setSelectionMode('lasso');
    }
  };

  const photosForOperations = useMemo(() => {
    if (photoData.selection.size > 0) {
      return photoData.allPhotos.filter((p) => photoData.selection.has(p.id));
    }
    return photoData.mapPhotos;
  }, [photoData.selection, photoData.allPhotos, photoData.mapPhotos]);

  const handleScanFolder = async () => {
    await folderScan.scanFolder(photoData.loadPhotos);
  };

  const handleTimelineToggle = () => {
    const newShowTimeline = !showTimeline;
    setShowTimeline(newShowTimeline);
    if (newShowTimeline) {
      // When opening timeline, restore last selection if it exists
      if (lastSelectedDateRange) {
        photoData.filterByDateRange(lastSelectedDateRange.start, lastSelectedDateRange.end, false);
      }
    } else {
      // When closing timeline, reset to show all photos
      photoData.resetDateFilter();
    }
  };

  const handleDateRangeChange = async (start: number, end: number) => {
    // If autoZoom is ON, we want to find ALL photos in the new date range (ignoring current map bounds)
    // so the map can auto-fit to them.
    // If autoZoom is OFF, we only want to see photos in the CURRENT view.
    await photoData.filterByDateRange(start, end, settings.autoZoomDuringPlay);
    // Remember this selection for when timeline is reopened
    setLastSelectedDateRange({ start, end });
  };

  const handleTimelineClose = () => {
    setShowTimeline(false);
    photoData.resetDateFilter();
  };

  // Prevent flash of empty state during initialization
  if (!photoData.isInitialized) {
    return null;
  }

  if (photoData.showMap && photoData.allPhotos.length > 0) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: colors.background,
          color: colors.textPrimary,
          overflow: 'hidden',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        {/* Map - Background Layer */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
          <MapView
            photos={photoData.mapPhotos}
            onPhotoClick={setSelectedPhoto}
            onViewChange={photoData.trackMapBounds}
            clusteringEnabled={settings.clusteringEnabled}
            clusterRadius={settings.clusterRadius}
            clusterMaxZoom={settings.clusterMaxZoom}
            transitionDuration={settings.mapTransitionDuration}
            maxZoom={settings.mapMaxZoom}
            tileMaxZoom={settings.tileMaxZoom}
            padding={settings.mapPadding}
            autoFit={
              showTimeline && settings.autoZoomDuringPlay ? photoData.filterSource !== 'map' : false
            }
            theme={theme}
            showHeatmap={settings.showHeatmap}
            selectionMode={selectionMode}
            selectedIds={photoData.selection}
            onSelectionChange={photoData.updateSelection}
            spiderSettings={{
              overlapTolerance: settings.spiderOverlapTolerance,
              radius: settings.spiderRadius,
              animationDuration: settings.spiderAnimationDuration,
              triggerZoom: settings.spiderTriggerZoom,
              collapseMargin: settings.spiderCollapseMargin,
              clearZoom: settings.spiderClearZoom,
            }}
          />
        </div>

        {/* Floating Header */}
        <FloatingHeader
          photoCount={photoData.mapPhotos.length}
          selectionCount={photoData.selection.size}
          selectionMode={selectionMode}
          dateRangeAvailable={!!photoData.dateRange}
          showTimeline={showTimeline}
          scanning={folderScan.scanning}
          colors={colors}
          onSelectionModeToggle={handleSelectionModeToggle}
          onOperationsOpen={() => setShowOperations(true)}
          onSettingsOpen={() => setShowSettings(true)}
          onTimelineToggle={handleTimelineToggle}
          onScanFolder={handleScanFolder}
        />

        {/* Floating Timeline */}
        {showTimeline && photoData.dateRange && (
          <div
            style={{
              position: 'absolute',
              bottom: '2rem',
              left: '2rem',
              right: '2rem',
              zIndex: 10,
              backgroundColor: colors.glassSurface,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: '16px',
              boxShadow: colors.shadow,
              padding: '1rem',
              transition: 'all 0.3s ease',
              pointerEvents: selectionMode === 'lasso' ? 'none' : 'auto',
              opacity: selectionMode === 'lasso' ? 0.5 : 1,
              filter: selectionMode === 'lasso' ? 'grayscale(100%)' : 'none',
            }}
          >
            <Timeline
              minDate={photoData.dateRange.min}
              maxDate={photoData.dateRange.max}
              startDate={
                photoData.selectedDateRange
                  ? photoData.selectedDateRange.start
                  : lastSelectedDateRange
                    ? lastSelectedDateRange.start
                    : photoData.dateRange.min
              }
              endDate={
                photoData.selectedDateRange
                  ? photoData.selectedDateRange.end
                  : lastSelectedDateRange
                    ? lastSelectedDateRange.end
                    : photoData.dateRange.max
              }
              totalPhotos={photoData.allPhotos.length}
              filteredPhotos={photoData.mapPhotos.length}
              onRangeChange={handleDateRangeChange}
              onClose={handleTimelineClose}
              updateInterval={settings.timelineUpdateInterval}
              theme={theme}
            />
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            onSettingsChange={setSettings}
            theme={theme}
            onThemeChange={toggleTheme}
            toast={toast}
          />
        )}

        {/* Operations Modal */}
        {showOperations && (
          <OperationsPanel
            selectedPhotos={photosForOperations}
            onClose={() => setShowOperations(false)}
            toast={toast}
          />
        )}

        {/* Photo Preview Modal */}
        {selectedPhoto && (
          <PhotoPreviewModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
        )}

        {/* Toast Notifications */}
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
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
        fontFamily: FONT_FAMILY,
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
          <div style={{ marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(folderScan.scanProgress.processed / folderScan.scanProgress.total) * 100}%`,
                  height: '100%',
                  backgroundColor: '#0066cc',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
          <p style={{ margin: '0.25rem 0', color: '#666' }}>
            Processing: {folderScan.scanProgress.processed} of {folderScan.scanProgress.total} files
            {folderScan.scanProgress.eta !== undefined && folderScan.scanProgress.eta > 0 && (
              <span style={{ marginLeft: '1rem', color: '#333' }}>
                ~{Math.floor(folderScan.scanProgress.eta / 60)} min{' '}
                {folderScan.scanProgress.eta % 60} sec remaining
              </span>
            )}
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </div>
  );
}

export default App;
