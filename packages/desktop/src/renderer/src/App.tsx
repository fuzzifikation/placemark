import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapView, SelectionMode } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings } from './components/Settings';
import { OperationsPanel } from './components/Operations/OperationsPanel';
import { LibraryStatsPanel } from './components/LibraryStatsPanel';
import { PlacemarksPanel } from './components/PlacemarksPanel';
import { FloatingHeader } from './components/FloatingHeader';
import { HelpModal } from './components/HelpModal';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { ScanOverlay } from './components/ScanOverlay';
import type { Photo } from '@placemark/core';
import { usePhotoData } from './hooks/usePhotoData';
import { useTheme } from './hooks/useTheme';
import { useFolderScan } from './hooks/useFolderScan';
import { useToast } from './hooks/useToast';
import { usePlacemarks } from './hooks/usePlacemarks';
import { useSettings } from './hooks/useSettings';
import { useModals } from './hooks/useModals';
import { ToastContainer } from './components/Toast/ToastContainer';
import { initSystemLocale } from './utils/formatLocale';
import { LAYOUT, Z_INDEX, TRANSITIONS, getGlassStyle } from './constants/ui';
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
  const placemarks = usePlacemarks();

  // Component state
  const {
    showTimeline,
    setShowTimeline,
    setIsTimelinePlaying,
    showSettings,
    setShowSettings,
    showStats,
    setShowStats,
    showOperations,
    setShowOperations,
    showHelp,
    setShowHelp,
    showPlacemarks,
    setShowPlacemarks,
    togglePlacemarks,
    showScanOverlay,
    setShowScanOverlay,
  } = useModals();
  // Suppresses the first onViewChange after a programmatic fly-to (placemark activation)
  const suppressNextViewChangeRef = useRef(false);
  const [targetMapBounds, setTargetMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [lastSelectedDateRange, setLastSelectedDateRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const { settings, setSettings } = useSettings();

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

  const handleViewChange = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      if (suppressNextViewChangeRef.current) {
        // Ignore the moveend from the programmatic fly-to that placemark activation triggers
        suppressNextViewChangeRef.current = false;
      } else if (placemarks.activePlacemarkId !== null) {
        // User panned/zoomed away — the view no longer matches the saved placemark
        placemarks.setActivePlacemarkId(null);
      }
      photoData.trackMapBounds(bounds);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placemarks.activePlacemarkId]
  );

  const handleActivatePlacemark = (id: number | 'thisYear' | 'last3Months' | null) => {
    placemarks.setActivePlacemarkId(id);

    if (id === null) {
      // Only clear the map target; leave the timeline filter as-is
      setTargetMapBounds(null);
      return;
    }

    if (id === 'thisYear') {
      const now = new Date();
      const rangeMin = photoData.dateRange?.min;
      const rangeMax = photoData.dateRange?.max;
      const start = Math.max(new Date(now.getFullYear(), 0, 1).getTime(), rangeMin ?? 0);
      const end = Math.min(now.getTime(), rangeMax ?? now.getTime());
      photoData.filterByDateRange(start, end);
      setLastSelectedDateRange({ start, end });
      setShowTimeline(true);
      setTargetMapBounds(null);
      return;
    }

    if (id === 'last3Months') {
      const now = Date.now();
      const rangeMin = photoData.dateRange?.min;
      const rangeMax = photoData.dateRange?.max;
      const start = Math.max(now - 90 * 24 * 60 * 60 * 1000, rangeMin ?? 0);
      const end = Math.min(now, rangeMax ?? now);
      photoData.filterByDateRange(start, end);
      setLastSelectedDateRange({ start, end });
      setShowTimeline(true);
      setTargetMapBounds(null);
      return;
    }

    // User-saved placemark
    const p = placemarks.placemarks.find((x) => x.id === id);
    if (!p) return;

    if (p.bounds) {
      suppressNextViewChangeRef.current = true;
      setTargetMapBounds({ ...p.bounds });
    } else {
      setTargetMapBounds(null);
    }

    if (p.dateStart || p.dateEnd) {
      const start = p.dateStart
        ? new Date(p.dateStart).getTime()
        : (photoData.dateRange?.min ?? Date.now());
      const end = p.dateEnd
        ? new Date(p.dateEnd).getTime()
        : (photoData.dateRange?.max ?? Date.now());
      photoData.filterByDateRange(start, end);
      setLastSelectedDateRange({ start, end });
      setShowTimeline(true);
    }
  };

  const handleTimelineToggle = () => {
    const newShowTimeline = !showTimeline;
    setShowTimeline(newShowTimeline);
    if (newShowTimeline) {
      // When opening timeline, restore last selection if it exists
      if (lastSelectedDateRange) {
        photoData.filterByDateRange(lastSelectedDateRange.start, lastSelectedDateRange.end);
      }
    } else {
      // When closing timeline, reset to show all photos
      photoData.resetDateFilter();
    }
  };

  const handleDateRangeChange = (start: number, end: number) => {
    // User dragged the timeline — no longer viewing the saved placemark
    if (placemarks.activePlacemarkId !== null) {
      placemarks.setActivePlacemarkId(null);
    }
    photoData.filterByDateRange(start, end);
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
          onPhotoClick={(photo) => {
            if (settings.singleClickOpensViewer) {
              window.api.photos.openInViewer(photo.id);
            } else {
              setSelectedPhoto(photo);
            }
          }}
          onViewChange={handleViewChange}
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
          fitPadding={{
            // Clear the floating header: inset + header height + gap below it
            top:
              settings.mapPadding +
              LAYOUT.PANEL_INSET_PX +
              LAYOUT.HEADER_HEIGHT_PX +
              LAYOUT.PANEL_GAP_PX,
            right: settings.mapPadding,
            // Clear the timeline panel when visible: inset + timeline height + gap above it
            bottom: showTimeline
              ? settings.mapPadding +
                LAYOUT.PANEL_INSET_PX +
                LAYOUT.TIMELINE_HEIGHT_PX +
                LAYOUT.PANEL_GAP_PX
              : settings.mapPadding,
            left: settings.mapPadding,
          }}
          targetBounds={targetMapBounds}
        />
      </div>

      {/* Floating Header - hidden when scan overlay is active */}
      {!showScanOverlay && hasPhotos && (
        <div
          style={{
            position: 'absolute',
            top: LAYOUT.PANEL_INSET,
            left: LAYOUT.PANEL_INSET,
            zIndex: Z_INDEX.HEADER,
          }}
        >
          <FloatingHeader
            photoCount={photoData.mapPhotos.length}
            selectionCount={photoData.selection.size}
            selectionMode={selectionMode}
            dateRangeAvailable={!!photoData.dateRange}
            showTimeline={showTimeline}
            showPlacemarks={showPlacemarks}
            scanning={folderScan.scanning}
            colors={colors}
            glassBlur={settings.glassBlur}
            glassSurfaceOpacity={settings.glassSurfaceOpacity}
            onSelectionModeToggle={handleSelectionModeToggle}
            onOperationsOpen={() => setShowOperations(true)}
            onSettingsOpen={() => setShowSettings(true)}
            onStatsOpen={() => setShowStats(true)}
            onTimelineToggle={handleTimelineToggle}
            onPlacemarksToggle={togglePlacemarks}
            onScanFolder={() => setShowScanOverlay(true)}
            onClearLibrary={handleClearLibrary}
            onHelpOpen={() => setShowHelp(true)}
          />
        </div>
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
            bottom: LAYOUT.PANEL_INSET,
            left: LAYOUT.PANEL_INSET,
            right: LAYOUT.PANEL_INSET,
            zIndex: Z_INDEX.TIMELINE,
            ...getGlassStyle(colors, settings.glassBlur, settings.glassSurfaceOpacity),
            padding: '0.25rem 1rem 1rem',
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
            playSpeedSlowMs={settings.playSpeedSlowDays * 24 * 60 * 60 * 1000}
            playSpeedMediumMs={settings.playSpeedMediumDays * 24 * 60 * 60 * 1000}
            playSpeedFastMs={settings.playSpeedFastDays * 24 * 60 * 60 * 1000}
            theme={theme}
            autoZoomDuringPlay={settings.autoZoomDuringPlay}
            onAutoZoomToggle={() =>
              setSettings((prev) => ({ ...prev, autoZoomDuringPlay: !prev.autoZoomDuringPlay }))
            }
            onPlayingChange={setIsTimelinePlaying}
          />
        </div>
      )}

      {/* Settings Modal - hidden during scan */}
      {!showScanOverlay && showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={setSettings}
          theme={theme}
          onThemeChange={toggleTheme}
          toast={toast}
        />
      )}

      {/* Placemarks Panel - left-side floating glass panel for saved geo+time filters */}
      {!showScanOverlay && showPlacemarks && (
        <div
          style={{
            position: 'absolute',
            top: `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.HEADER_HEIGHT} + ${LAYOUT.PANEL_GAP})`,
            left: LAYOUT.PANEL_INSET,
            bottom: showTimeline
              ? `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.TIMELINE_HEIGHT} + ${LAYOUT.PANEL_GAP})`
              : LAYOUT.PANEL_INSET,
            width: LAYOUT.PLACEMARKS_WIDTH,
            zIndex: Z_INDEX.HEADER,
            transition: `bottom ${TRANSITIONS.MEDIUM}`,
          }}
        >
          <PlacemarksPanel
            placemarks={placemarks.placemarks}
            smartCounts={placemarks.smartCounts}
            activePlacemarkId={placemarks.activePlacemarkId}
            currentBounds={photoData.mapBounds ?? null}
            currentDateRange={photoData.selectedDateRange}
            onActivate={handleActivatePlacemark}
            onCreate={placemarks.createPlacemark}
            onUpdate={async (id, input) => {
              await placemarks.updatePlacemark({ id, ...input });
            }}
            onDelete={placemarks.deletePlacemark}
            onClose={() => setShowPlacemarks(false)}
            theme={theme}
            glassBlur={settings.glassBlur}
            glassSurfaceOpacity={settings.glassSurfaceOpacity}
            reverseGeocodeEnabled={settings.reverseGeocodeEnabled}
          />
        </div>
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
          reverseGeocodeEnabled={settings.reverseGeocodeEnabled}
          theme={theme}
        />
      )}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} theme={theme} />}

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
