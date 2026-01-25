# Placemark — Implementation Plan

Step-by-step roadmap for building Placemark. See [technologydecisions.md](technologydecisions.md) for architecture details and technology choices.

**Current Status:** ✅ Phase 0 Complete | 🚧 Phase 1 - Local File Scanning + EXIF

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

### Phase 1: Local File Scanning + EXIF

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
- [ ] Can select folder via native dialog
- [ ] Scans recursively for JPG/PNG/HEIC files
- [ ] Extracts GPS coordinates correctly (test with known photos)
- [ ] Stores in SQLite with correct schema
- [ ] UI shows count: "152 photos with location data"
- [ ] Re-scanning same folder updates existing records (no duplicates)

**Deliverable:** Can scan local folder and see count of geotagged photos.

---

### Phase 2: Map Display

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
- [ ] Map loads with OpenStreetMap tiles
- [ ] Photo markers appear in correct locations
- [ ] Clicking marker shows photo preview
- [ ] Panning/zooming updates visible markers
- [ ] Performance: 10,000 photos render without lag (use clustering)
- [ ] Works offline with cached tiles

**Deliverable:** Interactive map showing photos as markers.

---

### Phase 3: Temporal Filtering

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
- [ ] Slider shows correct date range from data
- [ ] Moving slider filters photos in real-time
- [ ] Combining map bounds + date range works correctly
- [ ] Edge cases: no dates, partial dates, future dates
- [ ] Performance: filter 10,000 photos in <100ms

**Deliverable:** Can filter photos by both location and date.

---

### Phase 4: File Operations - Dry Run

**Goal:** Preview copy/move operations without executing.

**Tasks:**
1. Create `OperationsPanel.tsx` component
2. Implement `packages/core/src/operations/dryrun.ts`
3. Add UI: destination folder picker, operation type (copy/move)
4. Generate preview: source → destination paths
5. Show warnings: overwrite conflicts, disk space check
6. Implement `packages/core/src/operations/validator.ts`
7. Add "Execute" and "Cancel" buttons (Execute disabled for now)

**Testing:**
- [ ] Preview shows correct source → destination mappings
- [ ] Detects filename conflicts
- [ ] Warns if destination has insufficient space
- [ ] Validates destination path is writable
- [ ] Shows operation count and total size
- [ ] Cancel clears preview

**Deliverable:** Can preview file operations but not execute yet.

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
2. Map marker clustering (performance)
3. Incremental folder scanning (only new files)
4. File hash deduplication (same photo in multiple sources)
5. Settings: cache location, map tile source, scan schedule
6. Error boundary and crash reporting
7. User documentation (help screen)
8. Packaging with electron-builder (Windows .exe, macOS .dmg)

**Testing:**
- [ ] Performance with 100,000 photos
- [ ] Memory usage stays reasonable (<500MB)
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

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OneDrive API rate limits | High | Medium | Cache metadata locally, batch requests |
| Large photo libraries (100k+) | Medium | High | Virtual scrolling, incremental scans, indexing |
| EXIF parsing errors | Medium | Medium | Graceful fallback, log errors, continue scan |
| File operation failures | Medium | High | Transactional operations, dry-run preview |
| Map tile availability | Low | Medium | Cache tiles locally, fallback tile source |
| OAuth token expiry | High | Low | Auto-refresh, clear error messaging |

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
