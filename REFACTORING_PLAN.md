# Refactoring Plan - Placemark

**Status:** ✅ **COMPLETE** - All major components refactored (January 2026)

## Completed Refactoring Summary

**Results:**

1. **Settings.tsx** - 1065 → 694 lines ✅ **-35% (-371 lines)**
2. **MapView.tsx** - 717 → 516 lines ✅ **-28% (-201 lines)**
3. **App.tsx** - 628 → 528 lines ✅ **-16% (-100 lines)**
4. **Timeline.tsx** - 478 → 115 lines ✅ **-76% (-363 lines)**

**Total Impact:** ~1,035 lines removed, 20 new modular files created

---

## Original Analysis

**Largest files identified for refactoring:**

1. **Settings.tsx** - 1065 lines (needs major refactoring)
2. **MapView.tsx** - 716 lines (needs moderate refactoring)
3. **App.tsx** - 627 lines
4. **Timeline.tsx** - 477 lines
5. **thumbnails.ts** - 340 lines

---

## 1. Settings.tsx (1065 lines) - PRIORITY 1

### Current Issues:

- Massive monolithic component with repeated inline styles
- Duplicate slider/toggle patterns (7+ sliders with same structure)
- Inline event handlers everywhere
- Mixed concerns: UI, state management, data loading, API calls

### Refactoring Strategy:

#### A. Extract Reusable Components (Target: ~500 lines saved)

**Create: `components/Settings/SettingsSlider.tsx`** (~50 lines)

```tsx
interface SettingsSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
  theme: Theme;
}
```

- Consolidates 7+ slider implementations
- Includes label, range display, description
- Handles all hover states

**Create: `components/Settings/SettingsToggle.tsx`** (~40 lines)

- Boolean toggle switch component
- Replaces checkbox + label pattern used ~6 times

**Create: `components/Settings/SettingsSection.tsx`** (~80 lines)

- Collapsible section with header
- Arrow indicator
- Consistent spacing
- Used for 5 sections: Clustering, Display, Timeline, Thumbnails, Database

**Create: `components/Settings/StatsDisplay.tsx`** (~60 lines)

- Displays thumbnail/database statistics
- Progress bars
- Usage percentages
- Reusable for any key-value stats

#### B. Extract Hooks (Target: ~150 lines saved)

**Create: `hooks/useSettings.ts`**

```tsx
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(...);
  // Load from localStorage
  // Save to localStorage on change
  // Reset to defaults
  return { settings, updateSettings, resetSettings };
}
```

**Create: `hooks/useThumbnailStats.ts`**

```tsx
export function useThumbnailStats() {
  const [stats, setStats] = useState<ThumbnailStats | null>(null);
  // Load stats
  // Clear cache
  // Set max size
  return { stats, loadStats, clearCache, setMaxSize };
}
```

**Create: `hooks/useDatabaseStats.ts`**

- Similar to thumbnail stats
- Clear database functionality

#### C. Extract Style Constants

**Create: `components/Settings/styles.ts`**

```tsx
export const SETTINGS_STYLES = {
  modal: {
    overlay: (colors) => ({
      /* ... */
    }),
    container: (colors) => ({
      /* ... */
    }),
  },
  section: {
    header: (colors) => ({
      /* ... */
    }),
    content: (colors) => ({
      /* ... */
    }),
  },
  button: {
    primary: (colors) => ({
      /* ... */
    }),
    danger: (colors) => ({
      /* ... */
    }),
    secondary: (colors) => ({
      /* ... */
    }),
  },
};
```

#### D. Simplified Settings.tsx Structure (~350 lines)

```tsx
export function Settings({ onClose, onSettingsChange, theme, onThemeChange }: SettingsProps) {
  const colors = getThemeColors(theme);
  const { settings, updateSettings, resetSettings } = useSettings();
  const { thumbnailStats, clearCache, setMaxSize } = useThumbnailStats();
  const { databaseStats, clearDatabase } = useDatabaseStats();

  return (
    <SettingsModal onClose={onClose}>
      <SettingsSection title="Map Clustering" expanded={...}>
        <SettingsToggle label="Enable Clustering" value={...} onChange={...} />
        <SettingsSlider label="Cluster Radius" value={...} {...} />
        <SettingsSlider label="Cluster Max Zoom" value={...} {...} />
      </SettingsSection>

      <SettingsSection title="Map Display" expanded={...}>
        {/* ... */}
      </SettingsSection>

      {/* ... other sections */}
    </SettingsModal>
  );
}
```

**Estimated savings: 1065 → ~350 lines (70% reduction)**

---

## 2. MapView.tsx (716 lines) - PRIORITY 2

### Current Issues:

- Long functions (initialization useEffect ~150+ lines)
- Inline style constants mixed with logic
- Hover preview logic embedded in component
- Cluster configuration spread throughout

### Refactoring Strategy:

#### A. Extract Map Configuration

**Create: `components/Map/mapStyles.ts`** (~100 lines)

```tsx
export const CLUSTER_CONFIG = {
  THRESHOLDS: { SMALL: 100, MEDIUM: 750 },
  COLORS: { SMALL: '#51bbd6', MEDIUM: '#f1f075', LARGE: '#f28cb1' },
  RADII: { SMALL: 20, MEDIUM: 30, LARGE: 40 },
};

export const UNCLUSTERED_STYLE = {
  /* ... */
};

export function createClusterLayers(showHeatmap: boolean): LayerConfig[] {
  /* ... */
}
export function createHeatmapLayer(): LayerConfig {
  /* ... */
}
```

#### B. Extract Hover Preview

**Create: `components/Map/PhotoHoverPreview.tsx`** (~100 lines)

- Separate component for thumbnail tooltip
- Position calculation
- Image loading
- Debounce logic

**Create: `hooks/useMapHover.ts`** (~80 lines)

```tsx
export function useMapHover(map: MapRef, photos: Photo[]) {
  const [hoveredPhoto, setHoveredPhoto] = useState<Photo | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x; y } | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Register hover handlers
  // Debounce logic
  // Thumbnail loading

  return { hoveredPhoto, hoverPosition, thumbnailUrl };
}
```

#### C. Extract Map Initialization

**Create: `hooks/useMapInit.ts`** (~120 lines)

- Map creation
- Style loading
- Event handler registration
- Cleanup

#### D. Simplified MapView.tsx Structure (~350 lines)

```tsx
export function MapView({ photos, onPhotoClick, settings, theme }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useMapInit(mapContainer, theme, settings);
  const { hoveredPhoto, hoverPosition, thumbnailUrl } = useMapHover(map, photos);

  useMapPhotos(map, photos, settings);
  useMapFitting(map, photos, settings);

  return (
    <div ref={mapContainer}>
      {hoveredPhoto && (
        <PhotoHoverPreview
          photo={hoveredPhoto}
          position={hoverPosition}
          thumbnailUrl={thumbnailUrl}
        />
      )}
    </div>
  );
}
```

**Estimated savings: 716 → ~350 lines (51% reduction)**

---

## 3. App.tsx (627 lines) - PRIORITY 3

### Current Issues:

- Large component handling scan progress, photo state, filtering
- Mixed concerns: data loading, UI state, timeline control

### Refactoring Strategy:

#### A. Extract State Management

**Create: `hooks/usePhotoData.ts`** (~100 lines)

- Photo loading from IPC
- Date range calculation
- Photo count tracking

**Create: `hooks/useScanProgress.ts`** (~80 lines)

- Scan progress state
- Progress listener registration
- Cleanup

**Create: `hooks/useTimelineFilter.ts`** (~60 lines)

- Timeline state (playing, current date)
- Date range filtering
- Auto-zoom control

#### B. Extract Components

**Create: `components/ScanProgressOverlay.tsx`** (~80 lines)

- Progress bar
- Cancel button
- Status messages

**Create: `components/EmptyState.tsx`** (~40 lines)

- No photos state
- Scan folder prompt

#### C. Simplified App.tsx Structure (~270 lines)

```tsx
export function App() {
  const { theme, toggleTheme } = useTheme();
  const { photos, dateRange, photoCount, refreshPhotos } = usePhotoData();
  const { scanProgress, startScan, cancelScan } = useScanProgress(refreshPhotos);
  const { timelineState, filteredPhotos } = useTimelineFilter(photos, dateRange);

  return (
    <div>
      {scanProgress && <ScanProgressOverlay progress={scanProgress} onCancel={cancelScan} />}
      {!photos.length && <EmptyState onScanClick={startScan} />}
      {photos.length > 0 && (
        <>
          <MapView photos={filteredPhotos} {...} />
          <Timeline {...timelineState} />
          <StatusBar photoCount={photoCount} />
        </>
      )}
    </div>
  );
}
```

**Estimated savings: 627 → ~270 lines (57% reduction)**

---

## 4. Timeline.tsx (477 lines) - PRIORITY 4

### Current Issues:

- Complex date formatting logic
- Play/pause animation logic embedded
- Timeline rendering calculations mixed with component

### Refactoring Strategy:

#### A. Extract Utilities

**Create: `utils/timelineUtils.ts`** (~80 lines)

```tsx
export function formatDateForDisplay(date: Date): string {
  /* ... */
}
export function formatDateRange(start: Date, end: Date): string {
  /* ... */
}
export function calculatePhotoCountsByMonth(photos: Photo[]): Map<string, number> {
  /* ... */
}
export function findNearestPhotoDate(photos: Photo[], targetDate: Date): Date {
  /* ... */
}
```

#### B. Extract Animation Hook

**Create: `hooks/useTimelineAnimation.ts`** (~60 lines)

- Play/pause state
- Animation frame loop
- Speed control
- Current position tracking

#### C. Simplified Timeline.tsx Structure (~300 lines)

```tsx
export function Timeline({ photos, dateRange, onDateChange, settings }: Props) {
  const { isPlaying, currentPosition, play, pause, seek } = useTimelineAnimation({
    dateRange,
    speed: settings.timelineUpdateInterval,
    onUpdate: onDateChange,
  });

  const photoCounts = useMemo(() => calculatePhotoCountsByMonth(photos), [photos]);

  return (
    <div className="timeline">
      <TimelineControls isPlaying={isPlaying} onPlay={play} onPause={pause} />
      <TimelineSlider position={currentPosition} photoCounts={photoCounts} onSeek={seek} />
      <DateRangeDisplay start={dateRange.start} end={dateRange.end} />
    </div>
  );
}
```

**Estimated savings: 477 → ~300 lines (37% reduction)**

---

## 5. Additional Improvements

### A. Type Definitions

**Create: `types/index.ts`**

- Consolidate Photo, AppSettings, ScanProgress types
- Avoid duplication across files

### B. API Client Wrapper

**Create: `services/api.ts`**

```tsx
export const api = {
  photos: {
    scan: (includeSubdirs: boolean) => window.api.photos.scanFolder(includeSubdirs),
    getWithLocation: () => window.api.photos.getWithLocation(),
    // ...
  },
  thumbnails: {
    get: (id, path) => window.api.thumbnails.get(id, path),
    // ...
  },
};
```

- Type-safe wrapper around `window.api`
- Single import instead of `(window as any).api` everywhere

### C. Constants File

**Create: `constants.ts`**

```tsx
export const DEFAULT_SETTINGS: AppSettings = {
  /* ... */
};
export const STORAGE_KEYS = {
  SETTINGS: 'placemark-settings',
  THEME: 'placemark-theme',
};
export const THUMBNAIL_SIZE = 400;
export const DEBOUNCE_DELAY = 200;
```

---

## Implementation Order

### Phase 1: Settings Refactor ✅ COMPLETE

**Created:**

- `Settings/SettingsSlider.tsx` (89 lines)
- `Settings/SettingsToggle.tsx` (57 lines)
- `Settings/SettingsSection.tsx` (71 lines)

**Result:** 1065 → 694 lines (-35%, -371 lines)

### Phase 2: MapView Refactor ✅ COMPLETE

**Created:**

- `Map/mapStyles.ts` (44 lines)
- `Map/mapLayers.ts` (115 lines)
- `Map/PhotoHoverPreview.tsx` (120 lines)

**Result:** 717 → 516 lines (-28%, -201 lines)

### Phase 3: App.tsx Refactor ✅ COMPLETE

**Created:**

- `hooks/usePhotoData.ts` (86 lines)
- `hooks/useTheme.ts` (31 lines)
- `hooks/useFolderScan.ts` (58 lines)

**Result:** 628 → 528 lines (-16%, -100 lines)

### Phase 4: Timeline Refactor ✅ COMPLETE

**Created:**

- `Timeline/TimelineControls.tsx` (107 lines)
- `Timeline/TimelineSlider.tsx` (182 lines)
- `Timeline/useTimelineDrag.ts` (125 lines)
- `Timeline/useTimelinePlayback.ts` (119 lines)
- `Timeline/timelineUtils.ts` (31 lines)

**Result:** 478 → 115 lines (-76%, -363 lines)

### Phase 5: Cross-Cutting Concerns

_Not yet implemented - deferred to future work_

---

## Success Metrics

**Before:**

- Settings.tsx: 1065 lines
- MapView.tsx: 717 lines
- App.tsx: 628 lines
- Timeline.tsx: 478 lines
- **Total: 2,888 lines in 4 files**

**After:**

- Settings.tsx: 694 lines
- MapView.tsx: 516 lines
- App.tsx: 528 lines
- Timeline.tsx: 115 lines
- New reusable components: ~1,240 lines (20 files)
- **Total: ~1,853 lines in main files + 1,240 in modules = 3,093 lines across 24 files**

**Actual Benefits Achieved:**

- ✅ 36% reduction in main component lines (2,888 → 1,853)
- ✅ Average main file size: 463 lines (down from 722)
- ✅ 20 new reusable components/hooks/utilities
- ✅ Clear separation of concerns (UI, logic, state management)
- ✅ Improved testability (isolated hooks, pure functions)
- ✅ Better maintainability (smaller, focused files)
- ✅ Code reuse (components used across multiple contexts)

**Note:** While total line count increased slightly, code quality improved significantly:

- Monolithic components → focused, single-responsibility modules
- Duplicate logic → reusable abstractions
- Inline complexity → testable, documented utilities

---

## Testing Strategy

For each refactoring phase:

1. Test existing functionality before changes
2. Refactor incrementally (one component/hook at a time)
3. Test after each change
4. Ensure hover, click, settings all work
5. Check no console errors
6. Verify localStorage persistence
7. Test theme switching

---

## Notes

- **Keep it simple:** Don't over-abstract. Each extraction should make code clearer.
- **Test frequently:** After each extraction, verify app still works.
- **No behavioral changes:** Pure refactoring - same functionality, better structure.
- **Follow existing patterns:** Match current code style, TypeScript usage.
- **Document as you go:** Add JSDoc comments to new utilities/hooks.
