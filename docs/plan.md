# Placemark — Implementation Plan

Step-by-step roadmap for building Placemark. See [ARCHITECTURE.md](ARCHITECTURE.md) for system design and architecture patterns.

Placemark is intended to be cross-platform: it targets Windows and macOS on desktop, and iPhone and Android devices (phones and tablets) for future mobile support. The initial realization and primary platform target for the first release is Windows; however, all design and implementation decisions should prioritize future portability so macOS and mobile ports remain practical and low-effort.

**Current Status:** ✅ Phase 0 Complete | ✅ Phase 1 Complete | ✅ Phase 2 Complete | ✅ Phase 3 Complete | ✅ Phase 4A Complete | ⚙️ Phase 5 - Next

**Recent Work:**

- **Phase 4A Complete (v0.2.2):** Major code quality refactoring. Settings.tsx reduced from 854→388 lines (4 panels extracted). MapView.tsx reduced from 868→280 lines (3 hooks extracted). Zero TypeScript errors, all files under 400 lines.
- **v0.2.2 (Jan 30, 2026):** Code quality improvements: Refactored Settings.tsx (719→357 lines) and MapView.tsx (664→534 lines) by extracting hooks (useMapHover, useSpiderfy). Fixed type safety issues, implemented spiderify for overlapping markers.
- **v0.2.1 (Jan 29, 2026):** Major architectural refactoring for mobile compatibility. Extracted filtering logic to core package, created storage interface, reduced App.tsx from 737 to 313 lines. Project now ready for React Native port (Phase 9).
- **v0.2.0 (Jan 29, 2026):** Implemented manual Lasso Selection for photos. Users can now toggle into selection mode, draw a lasso to select multiple photos, and see the selection count in the UI. Refactored `MapView` to use `useLassoSelection` hook.

---

## Implementation Phases

### Phase 0: Project Setup ✅ COMPLETE

**Goal:** Establish monorepo, build system, and basic Electron shell.

**Tasks:**

1. Initialize pnpm workspace
2. Create `packages/core` with TypeScript config
3. Create `packages/desktop` with Electron + Vite
4. Set up build scripts and hot reload
5. Create basic window with "Hello World"

**Testing:**

- [x] `pnpm install` works
- [x] `pnpm dev` launches Electron window
- [x] Hot reload works for renderer changes
- [x] TypeScript compilation succeeds

**Deliverable:** ✅ Empty Electron app that opens a window.

---

### Phase 1: Local File Scanning + EXIF ✅ COMPLETE

**Goal:** Scan a local folder, extract EXIF GPS + timestamps, store in SQLite.

**Tasks:**

1. Create SQLite schema (photos table)
2. Implement `packages/core/src/models/Photo.ts`
3. Implement `packages/desktop/src/main/services/storage.ts` (SQLite)
4. Implement `packages/desktop/src/main/services/exif.ts` (exifr)
5. Implement `packages/desktop/src/main/services/filesystem.ts` (recursive scan)
6. Create IPC handler for "scan folder"
7. Add basic UI: folder picker + "Scan" button
8. Display count of photos found with GPS

**Testing:**

- [x] Can select folder via native dialog
- [x] Scans recursively for JPG/PNG/HEIC files
- [x] Extracts GPS coordinates correctly (test with known photos)
- [x] Stores in SQLite with correct schema
- [x] UI shows count: "152 photos with location data"
- [x] Re-scanning same folder updates existing records (no duplicates)

**Deliverable:** ✅ Can scan local folder and see count of geotagged photos.

---

### Phase 2: Map Display ✅ COMPLETE

**Goal:** Display photos as markers on a map using MapLibre.

**Tasks:**

1. Add MapLibre GL JS to renderer
2. Configure OpenStreetMap tile source
3. Create `MapView.tsx` component
4. Create IPC handler for "get photos in bounds"
5. Implement `packages/core/src/filters/geographic.ts`
6. Query SQLite with bounding box
7. Render markers on map (clustered if needed)
8. Click marker → show photo thumbnail

**Testing:**

- [x] Map loads with OpenStreetMap tiles
- [x] Photo markers appear in correct locations
- [x] Clicking marker shows photo preview
- [x] Panning/zooming updates visible markers
- [x] Performance: 10,000+ photos render without lag (clustering works well)
- [ ] Works offline with cached tiles - defer to Phase 8

**Deliverable:** ✅ Interactive map showing photos as markers with info modal.

---

### Phase 3: Temporal Filtering ✅ COMPLETE

**Goal:** Add date range slider to filter photos by time.

**Tasks:**

1. Implement `packages/core/src/filters/temporal.ts`
2. Create `DateRangeSlider.tsx` component
3. Query SQLite for min/max timestamps
4. Add timestamp index to database
5. Combine geographic + temporal filters
6. Update marker display based on both filters
7. Show selection summary: "87 photos (Jan 2023 - Mar 2023, Paris area)"

**Testing:**

- [x] Slider shows correct date range from data
- [x] Moving slider filters photos in real-time
- [x] Combining map bounds + date range works correctly
- [x] Edge cases: no dates, partial dates, future dates
- [x] Performance: filter 10,000 photos in <100ms

**Deliverable:** ✅ Timeline component with play controls, Settings system with 7 configurable parameters, smooth animations, and localStorage persistence.

---

### Phase 4: Code Quality & Usability Fixes ✅ COMPLETE

**Goal:** Improve code maintainability, fix type safety issues, and enhance immediate usability before expanding features.

**Completed Work:**

1. **Settings.tsx Refactoring:** ✅
   - Extracted 4 panel components: StorageSettings (289 lines), AboutSection (138 lines), AppearanceSettings (~100 lines), MapDisplaySettings (~170 lines), TimelineSettings (~130 lines), AdvancedSettings (~200 lines)
   - Reduced Settings.tsx from 854 → 388 lines (55% reduction)
   - All components under 300 lines, clean separation of concerns

2. **MapView.tsx Hook Extraction:** ✅
   - Extracted useMapEventHandlers (handles all map interaction events - ~421 lines)
   - Extracted useMapLayerManagement (manages GeoJSON sources and layers - ~305 lines)
   - Extracted useMapInitialization (initial map setup and lifecycle - ~114 lines)
   - Reduced MapView.tsx from 868 → 280 lines (68% reduction)
   - Better testability and reusability

3. **Type Safety Improvements:** ✅
   - Created useThemeColors() hook to eliminate 19 duplicate getThemeColors() calls
   - Removed all `(window as any).api` casts, using typed `window.api`
   - Zero TypeScript/ESLint errors across codebase

4. **Usability Fixes:** ✅
   - Implemented spiderify for overlapping photo markers
   - Lasso selection already implemented
   - Toast notification system fully functional

**Code Quality Metrics:**

- ✅ No files over 400 lines (Settings: 388, MapView: 280)
- ✅ Zero TypeScript compilation errors
- ✅ All hooks properly extracted and typed
- ✅ Clean separation of concerns

**Deliverable:** ✅ Clean, maintainable codebase ready for Phase 5 feature development.

---

### Phase 5: File Operations - Execution

**Goal:** Actually copy/move files with progress tracking.

**Tasks:**

1. Implement `packages/core/src/operations/engine.ts`
2. Add operation_log table to database
3. Create progress bar UI with cancel button
4. Implement file copy/move in main process
5. Stream progress updates via IPC
6. Handle errors gracefully (log, skip, retry)
7. Transaction support: mark operations as pending/completed/failed
8. **Duplicate Detection:** Background task to identify duplicates (hash/size) and offer cleanup options.

**Testing:**

- [ ] Copy operation creates files in destination
- [ ] Move operation removes source files
- [ ] Progress bar updates smoothly
- [ ] Cancel mid-operation stops cleanly
- [ ] Failed operations are logged with errors
- [ ] No partial/corrupted files on failure
- [ ] Can retry failed operations

**Deliverable:** Fully functional file copy/move.

---

### Phase 6: Network Shares

**Goal:** Support network-mounted folders (e.g., NAS).

**Tasks:**

1. Add "Network Share" source type
2. Handle UNC paths on Windows (\\server\share)
3. Handle SMB/NFS mounts on macOS/Linux
4. Test with slow network connections
5. Add retry logic for network timeouts
6. Cache scanned metadata (don't re-scan network on every launch)

**Testing:**

- [ ] Can scan network share via UNC path
- [ ] Handles network disconnection gracefully
- [ ] Performance acceptable on slow networks
- [ ] Cached metadata works when network unavailable

**Deliverable:** Network shares work like local folders.

---

### Phase 7: OneDrive Integration

**Goal:** Scan OneDrive photos via Microsoft Graph API.

**Tasks:**

1. Register app in Azure AD Portal
2. Implement OAuth flow with localhost redirect
3. Implement `packages/desktop/src/main/services/oauth.ts`
4. Implement `packages/desktop/src/main/services/onedrive.ts`
5. Paginate through OneDrive photos (Graph API)
6. Download EXIF metadata (no full file download)
7. Store with source='onedrive', path=OneDrive item ID
8. Add "Connect OneDrive" button in settings
9. Refresh token handling

**Testing:**

- [ ] OAuth flow completes successfully
- [ ] Can list OneDrive photos
- [ ] EXIF data extracted without downloading full files
- [ ] Tokens stored securely (safeStorage API)
- [ ] Token refresh works automatically
- [ ] Handles OneDrive API rate limits

**Deliverable:** OneDrive photos appear on map alongside local photos.

---

### Phase 8: Polish & Performance

**Goal:** Production-ready quality.

**Tasks:**

1. Virtual scrolling for photo grid (handle 100k+ photos)
2. **Spiderify Refinement:** Adjust activation radius based on zoom level (currently too sensitive when zoomed out) ✅ FIXED
3. **Multi-threaded Import:** Use worker threads for EXIF/thumbnail generation.
4. **Timeline Animation:** Visual "swooshes" connecting photos during playback.
5. Incremental folder scanning (only new files)
6. File hash deduplication (same photo in multiple sources)
7. Settings: cache location, map tile source, scan schedule
8. Error boundary and crash reporting
9. User documentation (help screen)
10. Packaging with electron-builder (Windows .exe, macOS .dmg)

**Testing:**

- [ ] Memory usage stays reasonable (<500MB with large datasets)
- [ ] App launches in <3 seconds
- [ ] All features work in packaged app
- [ ] Installation on fresh machine works

**Deliverable:** Installable desktop application.

---

### Phase 9: Mobile Foundation (Future)

**Goal:** Port core logic to React Native, basic photo display.

**Tasks:**

1. Create `packages/mobile` with React Native
2. Implement mobile storage service (react-native-sqlite-storage)
3. Implement photo library access (expo-media-library)
4. Extract EXIF from device photos
5. Display photos on map using react-native-maplibre
6. OneDrive OAuth via deep links

**Key Differences from Desktop:**

- No direct filesystem access (must use photo library APIs)
- All I/O is asynchronous
- Limited file operations (can't copy to arbitrary folders)
- OneDrive likely primary source on mobile
- Need location permissions from OS
- No network share support

**Testing:**

- [ ] Can access device photo library
- [ ] EXIF extraction works on iOS and Android
- [ ] Map displays with device photos
- [ ] OneDrive auth flow works on mobile
- [ ] App size <30MB

**Deliverable:** Mobile app showing device photos on map.

---

### Phase 10: AI & Location Inference (Future)

**Goal:** Infer locations for photos without GPS data.

**Tasks:**

1. **Hierarchy-based Inference:** Guess location from folder names (e.g., "Paris 2022").
2. **Opt-in Geocoding:** Integration with privacy-respecting geocoding APIs.
3. **Manual Tagging:** UI to drag-and-drop non-located photos onto the map.
4. **Transparency:** Log all inferred locations; distinguish distinctively from real EXIF data.

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Core package (types, logic)
pnpm -C packages/core build
pnpm -C packages/core test

# Desktop app development
pnpm -C packages/desktop dev          # Hot reload
pnpm -C packages/desktop build        # Production build
pnpm -C packages/desktop package      # Create installer

# All packages
pnpm -r build                          # Build all
pnpm -r test                           # Test all
```

## Testing Strategy

**Unit Tests (Vitest):**

- Core package: filter logic, query builders, validation
- Run fast (<1s), no I/O

**Integration Tests:**

- EXIF extraction with sample photos
- SQLite queries with test database
- File operations in temp directory

**E2E Tests (Playwright):**

- Full app workflow: scan → filter → preview → execute
- OneDrive OAuth flow (mock Graph API)

**Manual Testing:**

- Test with user's actual photo library (performance)
- Network disconnection scenarios
- Cross-platform (Windows, macOS)

## Risk Mitigation

| Risk                          | Likelihood | Impact | Mitigation                                     |
| ----------------------------- | ---------- | ------ | ---------------------------------------------- |
| OneDrive API rate limits      | High       | Medium | Cache metadata locally, batch requests         |
| Large photo libraries (100k+) | Medium     | High   | Virtual scrolling, incremental scans, indexing |
| EXIF parsing errors           | Medium     | Medium | Graceful fallback, log errors, continue scan   |
| File operation failures       | Medium     | High   | Transactional operations, dry-run preview      |
| Map tile availability         | Low        | Medium | Cache tiles locally, fallback tile source      |
| OAuth token expiry            | High       | Low    | Auto-refresh, clear error messaging            |

## Success Metrics

**Phase 1-3 (MVP):**

- Scan 10,000 photos in <30 seconds
- Map renders 10,000 markers with clustering
- Filter 10,000 photos in <100ms

**Phase 7 (OneDrive):**

- Connect to OneDrive in <30 seconds
- Scan 1,000 OneDrive photos in <2 minutes

**Phase 8 (Production):**

- Handle 100,000 photos without performance degradation
- Package size <150MB
- Cold start <3 seconds

## Backlog / Future Enhancements

- **Timeline Animation Bug:** The end-bars of the timeline do not move with the bar during play mode ✅ FIXED
- **About Section Updates:** Update the about section with the correct GitHub link and add a donate button ✅ FIXED (GitHub link corrected, donation link removed pending proper sponsor setup)
- **Settings Architecture Refactor:** Consolidate default values to single source of truth ✅ FIXED
