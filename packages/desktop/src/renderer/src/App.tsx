import { useState, useEffect, useMemo } from 'react';
import { MapView, SelectionMode } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings, AppSettings, DEFAULT_SETTINGS } from './components/Settings';
import { OperationsPanel } from './components/Operations/OperationsPanel';
import { LibraryStatsPanel } from './components/LibraryStatsPanel';
import { FloatingHeader } from './components/FloatingHeader';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { ScanOverlay } from './components/ScanOverlay';
import type { Photo } from '@placemark/core';
import { usePhotoData } from './hooks/usePhotoData';
import { useTheme } from './hooks/useTheme';
import { useFolderScan } from './hooks/useFolderScan';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast/ToastContainer';
import { initSystemLocale } from './utils/formatLocale';
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

  // Resolve OS regional-format locale for date/number formatting
  useEffect(() => {
    initSystemLocale();
  }, []);

  // Custom hooks
  const photoData = usePhotoData();
  const { theme, colors, toggleTheme } = useTheme();
  const folderScan = useFolderScan();
  const toast = useToast();

  // Component state
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [lastSelectedDateRange, setLastSelectedDateRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('placemark-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Auto-show scan overlay when library is empty after init
  useEffect(() => {
    if (photoData.isInitialized && photoData.allPhotos.length === 0) {
      setShowScanOverlay(true);
    }
  }, [photoData.isInitialized, photoData.allPhotos.length]);

  // Auto-open stats panel when scanning starts
  useEffect(() => {
    if (folderScan.scanning) {
      setShowStats(true);
    }
  }, [folderScan.scanning]);

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
    try {
      const result = await folderScan.scanFolder(photoData.loadPhotos, settings.maxFileSizeMB);

      if (!result || result.canceled) {
        // OS folder dialog was cancelled — close overlay only if photos already exist
        if (photoData.allPhotos.length > 0) {
          setShowScanOverlay(false);
        }
        return;
      }

      // Scan completed (or was aborted after partial processing) — close overlay
      setShowScanOverlay(false);

      if (result.errors && result.errors.length > 0) {
        toast.error(
          `Scan completed with ${result.errors.length} error(s). Some files could not be processed.`
        );
      } else if (result.photosWithLocation === 0) {
        toast.info('No photos with location data found in this folder.');
      } else {
        toast.success(
          `Found ${result.photosWithLocation} photo${result.photosWithLocation !== 1 ? 's' : ''} with location data.`
        );
      }
    } catch (error) {
      toast.error(`Failed to scan folder: ${error}`);
    }
  };

  const handleClearLibrary = async () => {
    if (
      !window.confirm(
        'Remove all photos from the library?\n\nThumbnail cache will also be cleared. Your actual photo files will not be deleted.'
      )
    ) {
      return;
    }
    // Clear both DB and thumbnail cache — thumbnails are keyed to photo IDs that no longer exist
    await window.api.photos.clearDatabase();
    await window.api.thumbnails.clearCache();
    await photoData.loadPhotos();
    // useEffect will auto-show scan overlay since photos.length becomes 0
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

  // Prevent flash during initialization
  if (!photoData.isInitialized) {
    return null;
  }

  const hasPhotos = photoData.allPhotos.length > 0;

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
      {/* Map - always rendered as backdrop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <MapView
          photos={photoData.mapPhotos}
          onPhotoClick={setSelectedPhoto}
          onViewChange={photoData.trackMapBounds}
          clusteringEnabled={settings.clusteringEnabled}
          clusterRadius={settings.clusterRadius}
          clusterMaxZoom={settings.clusterMaxZoom}
          transitionDuration={settings.mapTransitionDuration}
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
          glassBlur={settings.glassBlur}
          glassSurfaceOpacity={settings.glassSurfaceOpacity}
          clusterOpacity={settings.clusterOpacity}
          unclusteredPointOpacity={settings.unclusteredPointOpacity}
        />
      </div>

      {/* Floating Header - hidden when scan overlay is active */}
      {!showScanOverlay && hasPhotos && (
        <FloatingHeader
          photoCount={photoData.mapPhotos.length}
          selectionCount={photoData.selection.size}
          selectionMode={selectionMode}
          dateRangeAvailable={!!photoData.dateRange}
          showTimeline={showTimeline}
          scanning={folderScan.scanning}
          colors={colors}
          glassBlur={settings.glassBlur}
          glassSurfaceOpacity={settings.glassSurfaceOpacity}
          onSelectionModeToggle={handleSelectionModeToggle}
          onOperationsOpen={() => setShowOperations(true)}
          onSettingsOpen={() => setShowSettings(true)}
          onStatsOpen={() => setShowStats(true)}
          onTimelineToggle={handleTimelineToggle}
          onScanFolder={() => setShowScanOverlay(true)}
          onClearLibrary={handleClearLibrary}
        />
      )}

      {/* Scan Overlay - blocks map/header during scan or when library is empty */}
      {showScanOverlay && (
        <ScanOverlay
          hasPhotos={hasPhotos}
          scanning={folderScan.scanning}
          scanProgress={folderScan.scanProgress}
          includeSubdirectories={folderScan.includeSubdirectories}
          onIncludeSubdirectoriesChange={folderScan.setIncludeSubdirectories}
          onScan={handleScanFolder}
          onAbort={folderScan.abortScan}
          onClose={() => setShowScanOverlay(false)}
          colors={colors}
          glassBlur={settings.glassBlur}
          glassSurfaceOpacity={settings.glassSurfaceOpacity}
        />
      )}

      {/* Floating Timeline - hidden during scan */}
      {!showScanOverlay && showTimeline && photoData.dateRange && (
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '2rem',
            right: '2rem',
            zIndex: 10,
            backgroundColor: `rgba(${
              colors.glassSurface.includes('255') ? '255, 255, 255' : '30, 41, 59'
            }, ${settings.glassSurfaceOpacity / 100})`,
            backdropFilter: `blur(${settings.glassBlur}px)`,
            WebkitBackdropFilter: `blur(${settings.glassBlur}px)`,
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
            autoZoomDuringPlay={settings.autoZoomDuringPlay}
            onAutoZoomToggle={() =>
              setSettings((prev) => ({ ...prev, autoZoomDuringPlay: !prev.autoZoomDuringPlay }))
            }
          />
        </div>
      )}

      {/* Settings Modal - hidden during scan */}
      {!showScanOverlay && showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onSettingsChange={setSettings}
          theme={theme}
          onThemeChange={toggleTheme}
          toast={toast}
        />
      )}

      {/* Library Stats Panel - stays visible during scan for live updates */}
      {showStats && (
        <LibraryStatsPanel
          onClose={() => setShowStats(false)}
          theme={theme}
          isScanning={folderScan.scanning}
        />
      )}

      {/* Operations Modal - hidden during scan */}
      {!showScanOverlay && showOperations && (
        <OperationsPanel
          selectedPhotos={photosForOperations}
          onClose={() => setShowOperations(false)}
          onRefreshPhotos={photoData.loadPhotos}
          toast={toast}
        />
      )}

      {/* Photo Preview Modal - hidden during scan */}
      {!showScanOverlay && selectedPhoto && (
        <PhotoPreviewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          theme={theme}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toast.toasts}
        removeToast={toast.removeToast}
        duration={settings.toastDuration}
      />
    </div>
  );
}

export default App;
