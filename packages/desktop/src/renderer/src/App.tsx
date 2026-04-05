import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapView, SelectionMode } from './components/MapView';
import { Timeline } from './components/Timeline';
import { Settings } from './components/Settings';
import { OperationsPanel } from './components/Operations/OperationsPanel';
import { LibraryStatsPanel } from './components/LibraryStatsPanel';
import { PlacemarksPanel } from './components/PlacemarksPanel';
import { FloatingHeader } from './components/FloatingHeader';
import { FilterChipStrip } from './components/FilterChipStrip';
import { HelpModal } from './components/HelpModal';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { ScanOverlay } from './components/ScanOverlay';
import { ExportSheet } from './components/ExportSheet';
import { VersionMismatchModal } from './components/VersionMismatchModal';
import type { Photo } from '@placemark/core';
import { usePhotoData } from './hooks/usePhotoData';
import { useTheme } from './hooks/useTheme';
import { useFolderScan } from './hooks/useFolderScan';
import { useToast } from './hooks/useToast';
import { usePlacemarks } from './hooks/usePlacemarks';
import { useSettings } from './hooks/useSettings';
import { useModals } from './hooks/useModals';
import { useScanActions } from './hooks/useScanActions';
import { useTimelineActions } from './hooks/useTimelineActions';
import { usePlacemarkActions } from './hooks/usePlacemarkActions';
import { useExportData } from './hooks/useExportData';
import { ToastContainer } from './components/Toast/ToastContainer';
import { initSystemLocale } from './utils/formatLocale';
import { LAYOUT, Z_INDEX, TRANSITIONS, getGlassStyle } from './constants/ui';
import './types/preload.d';

function App() {
  // --- One-time setup effects ---
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body, #root {
        margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    initSystemLocale();
  }, []);

  // --- Version mismatch check ---
  const [versionMismatch, setVersionMismatch] = useState<{
    previous: string;
    current: string;
  } | null>(null);

  useEffect(() => {
    window.api.system.checkVersionStamp().then((result) => {
      if (result.mismatch && result.stored) {
        setVersionMismatch({ previous: result.stored, current: result.current });
      }
    });
  }, []);

  // --- Core hooks ---
  const photoData = usePhotoData();
  const { theme, colors, toggleTheme } = useTheme();
  const folderScan = useFolderScan();
  const toast = useToast();
  const placemarks = usePlacemarks();
  const { settings, setSettings } = useSettings();
  const modals = useModals();
  const [fitSignal, setFitSignal] = useState(0);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('pan');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // --- Composed action hooks ---
  const scanActions = useScanActions({
    folderScan,
    photoData,
    settings,
    toast,
    setShowScanOverlay: modals.setShowScanOverlay,
    setFitSignal,
  });

  const timelineActions = useTimelineActions({
    photoData,
    placemarks,
    showTimeline: modals.showTimeline,
    setShowTimeline: modals.setShowTimeline,
  });

  const placemarkActions = usePlacemarkActions({
    photoData,
    placemarks,
    setShowTimeline: modals.setShowTimeline,
    setLastSelectedDateRange: timelineActions.setLastSelectedDateRange,
  });

  const exportData = useExportData({ photoData });

  // --- Side effects ---
  useEffect(() => {
    if (photoData.isInitialized && photoData.allPhotos.length === 0) {
      modals.setShowScanOverlay(true);
    }
  }, [photoData.isInitialized, photoData.allPhotos.length]);

  useEffect(() => {
    if (folderScan.scanning) {
      modals.setShowStats(true);
    }
  }, [folderScan.scanning]);

  // --- Local handlers ---
  const handleSelectionModeToggle = useCallback(() => {
    if (selectionMode === 'lasso') {
      setSelectionMode('pan');
      photoData.clearSelection();
    } else {
      setSelectionMode('lasso');
    }
  }, [selectionMode, photoData.clearSelection]);

  const photosForOperations = useMemo(() => {
    if (photoData.selection.size > 0) {
      return photoData.allPhotos.filter((p) => photoData.selection.has(p.id));
    }
    return photoData.mapPhotos;
  }, [photoData.selection, photoData.allPhotos, photoData.mapPhotos]);

  // --- Render ---
  if (!photoData.isInitialized) return null;

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
      {/* Map */}
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
          onViewChange={placemarkActions.handleViewChange}
          clusteringEnabled={settings.clusteringEnabled}
          clusterRadius={settings.clusterRadius}
          clusterMaxZoom={settings.clusterMaxZoom}
          transitionDuration={settings.mapTransitionDuration}
          tileMaxZoom={settings.tileMaxZoom}
          padding={settings.mapPadding}
          autoFit={
            modals.showTimeline && settings.autoZoomDuringPlay
              ? photoData.filterSource !== 'map'
              : false
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
            top:
              settings.mapPadding +
              LAYOUT.PANEL_INSET_PX +
              LAYOUT.HEADER_HEIGHT_PX +
              LAYOUT.PANEL_GAP_PX,
            right: modals.showStats
              ? settings.mapPadding +
                LAYOUT.PANEL_INSET_PX +
                LAYOUT.STATS_PANEL_WIDTH_PX +
                LAYOUT.PANEL_GAP_PX
              : settings.mapPadding,
            bottom: modals.showTimeline
              ? settings.mapPadding +
                LAYOUT.PANEL_INSET_PX +
                LAYOUT.TIMELINE_HEIGHT_PX +
                LAYOUT.PANEL_GAP_PX
              : settings.mapPadding,
            left: settings.mapPadding,
          }}
          targetBounds={placemarkActions.targetMapBounds}
          fitSignal={fitSignal}
          rightPanelWidth={modals.showStats ? LAYOUT.STATS_PANEL_WIDTH_PX + LAYOUT.PANEL_GAP_PX : 0}
          rightPanelTopPx={LAYOUT.PANEL_INSET_PX + LAYOUT.HEADER_HEIGHT_PX + LAYOUT.PANEL_GAP_PX}
        />
      </div>

      {/* Floating Header */}
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
          showTimeline={modals.showTimeline}
          showPlacemarks={modals.showPlacemarks}
          scanning={folderScan.scanning}
          colors={colors}
          glassBlur={settings.glassBlur}
          glassSurfaceOpacity={settings.glassSurfaceOpacity}
          onSelectionModeToggle={handleSelectionModeToggle}
          onOperationsOpen={() => modals.setShowOperations(true)}
          onExportOpen={() => exportData.setShowExport(true)}
          onSettingsOpen={() => modals.setShowSettings(true)}
          showStats={modals.showStats}
          onStatsToggle={() => modals.setShowStats(!modals.showStats)}
          onTimelineToggle={timelineActions.handleTimelineToggle}
          onPlacemarksToggle={modals.togglePlacemarks}
          onScanFolder={() => modals.setShowScanOverlay(true)}
          onClearLibrary={scanActions.handleClearLibrary}
          onHelpOpen={() => modals.setShowHelp(true)}
        />
      </div>

      {/* Filter Chips */}
      {!modals.showScanOverlay && (
        <FilterChipStrip
          activeFilters={photoData.activeFilters}
          showStats={modals.showStats}
          colors={colors}
          glassBlur={settings.glassBlur}
          onToggleMimeType={photoData.toggleMimeTypeFilter}
          onToggleCamera={photoData.toggleCameraFilter}
          onClearAll={photoData.clearAllFilters}
        />
      )}

      {/* Scan Overlay */}
      {modals.showScanOverlay && (
        <ScanOverlay
          hasPhotos={hasPhotos}
          scanning={folderScan.scanning}
          scanProgress={folderScan.scanProgress}
          includeSubdirectories={folderScan.includeSubdirectories}
          onIncludeSubdirectoriesChange={folderScan.setIncludeSubdirectories}
          onScan={scanActions.handleScanFolder}
          onOneDriveSelect={scanActions.handleSelectOneDriveFolder}
          onAbort={folderScan.abortScan}
          onClose={() => modals.setShowScanOverlay(false)}
          colors={colors}
          glassBlur={settings.glassBlur}
          glassSurfaceOpacity={settings.glassSurfaceOpacity}
        />
      )}

      {/* Timeline */}
      {!modals.showScanOverlay && modals.showTimeline && photoData.dateRange && (
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
                : timelineActions.lastSelectedDateRange
                  ? timelineActions.lastSelectedDateRange.start
                  : photoData.dateRange.min
            }
            endDate={
              photoData.selectedDateRange
                ? photoData.selectedDateRange.end
                : timelineActions.lastSelectedDateRange
                  ? timelineActions.lastSelectedDateRange.end
                  : photoData.dateRange.max
            }
            totalPhotos={photoData.allPhotos.length}
            filteredPhotos={photoData.mapPhotos.length}
            onRangeChange={timelineActions.handleDateRangeChange}
            onClose={timelineActions.handleTimelineClose}
            updateInterval={settings.timelineUpdateInterval}
            playSpeedSlowMs={settings.playSpeedSlowDays * 24 * 60 * 60 * 1000}
            playSpeedMediumMs={settings.playSpeedMediumDays * 24 * 60 * 60 * 1000}
            playSpeedFastMs={settings.playSpeedFastDays * 24 * 60 * 60 * 1000}
            theme={theme}
            autoZoomDuringPlay={settings.autoZoomDuringPlay}
            onAutoZoomToggle={() =>
              setSettings((prev) => ({ ...prev, autoZoomDuringPlay: !prev.autoZoomDuringPlay }))
            }
            onFitToView={
              timelineActions.fitToViewRange ? timelineActions.handleFitTimelineToView : undefined
            }
          />
        </div>
      )}

      {/* Settings */}
      {!modals.showScanOverlay && modals.showSettings && (
        <Settings
          onClose={() => modals.setShowSettings(false)}
          onUpgradeOpen={() => modals.setShowUpgrade(true)}
          settings={settings}
          onSettingsChange={setSettings}
          theme={theme}
          onThemeChange={toggleTheme}
          toast={toast}
        />
      )}

      {/* Placemarks Panel */}
      {!modals.showScanOverlay && modals.showPlacemarks && (
        <div
          style={{
            position: 'absolute',
            top: `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.HEADER_HEIGHT} + ${LAYOUT.PANEL_GAP})`,
            left: LAYOUT.PANEL_INSET,
            bottom: modals.showTimeline
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
            onActivate={placemarkActions.handleActivatePlacemark}
            onCreate={placemarks.createPlacemark}
            onUpdate={async (id, input) => {
              await placemarks.updatePlacemark({ id, ...input });
            }}
            onDelete={placemarks.deletePlacemark}
            onClose={() => modals.setShowPlacemarks(false)}
            onRefreshPlacemarks={placemarks.refresh}
            theme={theme}
            glassBlur={settings.glassBlur}
            glassSurfaceOpacity={settings.glassSurfaceOpacity}
            reverseGeocodeEnabled={settings.reverseGeocodeEnabled}
          />
        </div>
      )}

      {/* Library Stats Panel */}
      {modals.showStats && (
        <div
          style={{
            position: 'absolute',
            top: `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.HEADER_HEIGHT} + ${LAYOUT.PANEL_GAP})`,
            right: LAYOUT.PANEL_INSET,
            bottom: modals.showTimeline
              ? `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.TIMELINE_HEIGHT} + ${LAYOUT.PANEL_GAP})`
              : LAYOUT.PANEL_INSET,
            width: LAYOUT.STATS_PANEL_WIDTH,
            zIndex: Z_INDEX.HEADER,
            transition: `bottom ${TRANSITIONS.MEDIUM}`,
          }}
        >
          <LibraryStatsPanel
            onClose={() => modals.setShowStats(false)}
            theme={theme}
            isScanning={folderScan.scanning}
            activeFilters={photoData.activeFilters}
            onToggleMimeType={photoData.toggleMimeTypeFilter}
            onToggleCamera={photoData.toggleCameraFilter}
            glassBlur={settings.glassBlur}
            glassSurfaceOpacity={settings.glassSurfaceOpacity}
          />
        </div>
      )}

      {/* Operations */}
      {!modals.showScanOverlay && modals.showOperations && (
        <OperationsPanel
          selectedPhotos={photosForOperations}
          onClose={() => modals.setShowOperations(false)}
          onRefreshPhotos={photoData.loadPhotos}
          toast={toast}
        />
      )}

      {/* Photo Preview */}
      {!modals.showScanOverlay && selectedPhoto && (
        <PhotoPreviewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          reverseGeocodeEnabled={settings.reverseGeocodeEnabled}
          theme={theme}
        />
      )}

      {/* Version Mismatch */}
      {versionMismatch && (
        <VersionMismatchModal
          previousVersion={versionMismatch.previous}
          currentVersion={versionMismatch.current}
          onKeep={async () => {
            await window.api.system.acceptVersionStamp();
            setVersionMismatch(null);
          }}
          theme={theme}
        />
      )}

      {/* Help */}
      {modals.showHelp && <HelpModal onClose={() => modals.setShowHelp(false)} theme={theme} />}

      {/* Pro Upgrade */}
      {!modals.showScanOverlay && modals.showUpgrade && (
        <ProUpgradeModal
          onClose={() => modals.setShowUpgrade(false)}
          onUpgrade={() =>
            toast.info('Microsoft Store purchasing is not enabled in this build yet.')
          }
          theme={theme}
        />
      )}

      {/* Export */}
      {exportData.showExport && (
        <ExportSheet
          photoIds={exportData.exportPhotoIds}
          scopeLabel={exportData.exportScopeLabel}
          onClose={() => exportData.setShowExport(false)}
          theme={theme}
          glassBlur={settings.glassBlur}
          glassSurfaceOpacity={settings.glassSurfaceOpacity}
          onSuccess={toast.success}
          onError={toast.error}
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
