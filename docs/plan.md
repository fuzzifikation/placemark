# Placemark — Implementation Plan

Step-by-step roadmap for building Placemark. See [ARCHITECTURE.md](ARCHITECTURE.md) for system design and architecture patterns.

Placemark is intended to be cross-platform: it targets Windows and macOS on desktop, and iPhone and Android devices (phones and tablets) for future mobile support. The initial realization and primary platform target for the first release is Windows; however, all design and implementation decisions should prioritize future portability so macOS and mobile ports remain practical and low-effort.

**Current Status:** ✅ Phase 0 Complete | ✅ Phase 1 Complete | ✅ Phase 2 Complete | ✅ Phase 3 Complete | ✅ Phase 4A Complete | ✅ Phase 5 Complete | ⚙️ Phase 5.5 - Next (RAW support) | Phase 6 queued

**Recent Work:**

- **v0.6.0 — Locale-aware formatting:** All dates/numbers respect the OS regional format setting (e.g. German date format with English UI). New `formatLocale.ts` utility, `system:getSystemLocale` IPC channel.
- **Phase 5 Complete (v0.5.0):** Full file operations execution with atomic batch semantics, undo support, and database sync. Copy/move operations fully functional with conflict detection, rollback on failure, and OS trash integration for undo.
- **Phase 4A Complete (v0.2.2):** Major code quality refactoring. Settings.tsx reduced from 854→388 lines (4 panels extracted). MapView.tsx reduced from 868→280 lines (3 hooks extracted). Zero TypeScript errors, all files under 400 lines.
- **v0.2.2 (Jan 30, 2026):** Code quality improvements: Refactored Settings.tsx (719→357 lines) and MapView.tsx (664→534 lines) by extracting hooks (useMapHover, useSpiderfy). Fixed type safety issues, implemented spiderify for overlapping markers.

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

### Phase 5: File Operations - Execution ✅ COMPLETE

**Goal:** Actually copy/move files with progress tracking.

**Completed Tasks:**

1. ✅ Implemented `packages/desktop/src/main/services/operations.ts` with atomic batch execution
2. ✅ Added `operation_batch` and `operation_batch_files` tables (migrations v3, v4)
3. ✅ Progress tracking with file-by-file updates via IPC
4. ✅ File copy/move with cross-device support and verification
5. ✅ Batch undo with OS trash integration (Recycle Bin/Trash)
6. ✅ Database synchronization: move operations update photo paths
7. ✅ UI refresh after move/undo operations
8. ✅ Pre-flight validation: conflict detection, same-file skip
9. ✅ Rollback on failure: completed files restored if mid-batch error
10. ✅ Session-based undo: history clears on app restart

**Testing:**

- [x] Copy operation creates files in destination
- [x] Move operation removes source files
- [x] Progress updates in real-time
- [x] Conflict detection prevents overwrites
- [x] Failed operations roll back cleanly
- [x] No partial/corrupted files on failure
- [x] Undo restores files (copy→trash, move→original location)
- [x] Database stays in sync with filesystem after move

**Deliverable:** ✅ Fully functional file copy/move with undo support.

---

### Phase 5.5: Camera RAW Format Support

**Goal:** Support professional camera RAW formats for EXIF extraction and thumbnail preview. Immediate priority — expands the audience to serious photographers.

**Context:** Currently Placemark only supports JPEG, PNG, HEIC/HEIF, TIFF, and WebP. Professional photographers shoot in RAW. Windows 10/11 natively supports RAW previews via the free "Raw Image Extension" from the Microsoft Store, so users already expect these formats to work.

#### New Formats to Support

| Format                  | Extension(s) | Camera Brand                    |
| ----------------------- | ------------ | ------------------------------- |
| Canon RAW 2             | `.cr2`       | Canon (older)                   |
| Canon RAW 3             | `.cr3`       | Canon (newer)                   |
| Nikon Electronic Format | `.nef`       | Nikon                           |
| Nikon RAW               | `.nrw`       | Nikon (consumer)                |
| Sony Alpha RAW          | `.arw`       | Sony                            |
| Digital Negative        | `.dng`       | Adobe / Leica / Google / others |
| Fujifilm RAW            | `.raf`       | Fujifilm                        |
| Olympus RAW             | `.orf`       | Olympus / OM System             |
| Panasonic RAW           | `.rw2`       | Panasonic / Lumix               |
| Pentax RAW              | `.pef`       | Pentax / Ricoh                  |
| Samsung RAW             | `.srw`       | Samsung                         |
| Leica RAW               | `.rwl`       | Leica                           |

#### Implementation

**No new dependencies required.** Both existing libraries handle RAW files:

**1. EXIF extraction (exifr — already installed)**

exifr natively reads EXIF/GPS/timestamp metadata from all TIFF-based RAW formats (which is virtually all of them). No code changes needed in the parsing logic — only the file extension filter needs updating.

**2. Thumbnail generation — Embedded JPEG Preview Strategy**

Sharp cannot decode RAW sensor data directly. However, every modern RAW file embeds a JPEG preview (typically 1536×1024 or larger) in its EXIF data. The strategy:

1. Use `exifr.thumbnail(buffer)` to extract the embedded JPEG preview from the RAW file
2. Pass the extracted JPEG buffer to Sharp for resizing to 400×400 thumbnail
3. If no embedded thumbnail exists (rare), skip thumbnail generation — photo still appears on map, just without hover preview

This approach is fast (no RAW decode), requires zero new dependencies, and produces good quality previews.

**Alternatives evaluated and rejected:**

| Alternative                             | Why rejected                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **dcraw.js** (Emscripten port of dcraw) | GPL-2.0 license — incompatible with Store distribution. 8 years unmaintained. Large WASM payload. |
| **LibRaw native addon**                 | Requires per-platform native compilation. LGPL/CDDL dual license. Heavy dependency.               |
| **Windows WIC via COM/PowerShell**      | Windows-only. Slow (process spawn per file). Complex IPC. Breaks cross-platform goal.             |
| **Full Sharp RAW decode**               | Not supported — Sharp/libvips cannot decode RAW sensor data.                                      |

#### Tasks

1. **Update file extension filter** in `exif.ts`:
   - Add `.cr2`, `.cr3`, `.nef`, `.nrw`, `.arw`, `.dng`, `.raf`, `.orf`, `.rw2`, `.pef`, `.srw`, `.rwl` to `isSupportedImageFile()`
2. **Update thumbnail service** in `thumbnails.ts`:
   - Before calling `sharp(filePath)`, check if the file is a RAW format
   - If RAW: read file into buffer → `exifr.thumbnail(buffer)` → pass JPEG buffer to `sharp(buffer).resize(400, 400)`
   - If standard format: existing `sharp(filePath)` path (unchanged)
   - Handle missing embedded thumbnail gracefully (return null, photo still works on map)
3. **Update MIME type mapping** — add `image/x-canon-cr2`, `image/x-nikon-nef`, `image/x-adobe-dng`, etc. or use generic `image/x-raw` for all RAW types
4. **Test with real RAW files** — need sample `.cr2`, `.nef`, `.arw`, `.dng` files
5. **Update documentation** — README, beta_testing.md supported format list

#### Estimated Effort

| Task                        | Complexity | Time          |
| --------------------------- | ---------- | ------------- |
| Extension filter update     | Trivial    | 10 min        |
| RAW thumbnail extraction    | Low-Medium | 1–2 hours     |
| MIME type mapping           | Trivial    | 15 min        |
| Testing with real RAW files | Medium     | 1–2 hours     |
| Documentation updates       | Low        | 30 min        |
| **Total**                   |            | **~half day** |

#### Testing

- [ ] `.cr2` file scanned → GPS extracted correctly
- [ ] `.nef` file scanned → GPS extracted correctly
- [ ] `.arw` file scanned → GPS extracted correctly
- [ ] `.dng` file scanned → GPS and timestamp extracted
- [ ] `.raf`, `.orf`, `.rw2` scanned → metadata extracted
- [ ] RAW thumbnail hover preview shows embedded JPEG preview
- [ ] RAW file without embedded thumbnail → no crash, marker works, no preview
- [ ] RAW files counted correctly in scan results
- [ ] Copy/move operations work for RAW files
- [ ] Mixed scan (JPEG + RAW in same folder) → all processed
- [ ] Performance: scanning folder with 200 RAW files (50MB+ each) completes in reasonable time
- [ ] 100MB file size limit still enforced for RAW files

**Deliverable:** Professional camera RAW files appear on the map with thumbnails, using zero new dependencies.

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

### Phase 10: GPS Editing (Pro Feature)

**Goal:** Allow users to view, add, correct, and remove GPS coordinates on photos — both in the database and written back to the EXIF data in the actual file. This is a Pro-only feature (see [business_model.md](business_model.md)).

**Why This Matters:**

- Many older photos, scanned images, and some camera models produce photos with no GPS data. These photos are currently invisible on the map.
- GPS coordinates are sometimes wrong (firmware bugs, indoor shots geotagged to cell tower, travel photos tagged to home location).
- Users want to place vacation photos at the right landmark, not just "somewhere in Paris."

#### 10.1 Core: EXIF GPS Writing

**Tasks:**

1. Add an EXIF writing library to the desktop package. Options:
   - [`piexifjs`](https://github.com/nicerday/piexif) — pure JS, JPEG only, reads/writes EXIF
   - [`exif-writer`](https://github.com/nicerday/piexif) — lightweight GPS-focused writer
   - Write GPS tags directly using `sharp` metadata API (`sharp().withMetadata({ exif })`) — already a dependency
   - **Recommendation:** Use `sharp` for JPEG/TIFF/WebP (already installed). For HEIC, evaluate `piexifjs` or defer HEIC writing.
2. Implement `packages/desktop/src/main/services/exifWriter.ts`:
   - `writeGpsToFile(filePath: string, lat: number, lng: number): Promise<void>`
   - `removeGpsFromFile(filePath: string): Promise<void>`
   - Write to a temp file first, verify, then replace original (atomic write — never corrupt the original)
   - Preserve all other EXIF tags (camera model, exposure, etc.)
3. Add IPC handlers:
   - `photos:setLocation` — accepts `{ photoId: number, latitude: number, longitude: number }`
   - `photos:removeLocation` — accepts `{ photoId: number }`
   - `photos:setLocationBatch` — accepts `{ photoIds: number[], latitude: number, longitude: number }`
4. Update database after EXIF write succeeds (not before).
5. Add `location_source` column to photos table:
   - `'exif'` — original EXIF GPS data from scan
   - `'manual'` — user-set via drag/drop or address
   - `'inferred'` — guessed from folder name or other heuristic (Phase 10.4)
   - This column is informational — all sources are treated equally on the map, but the UI can show a badge.

**Safety:**

- Always back up original EXIF before overwriting (store original lat/lng in a `gps_edit_history` table)
- Support undo: restore original GPS from history table + rewrite EXIF
- Never write to files on read-only mounts or network shares without explicit user confirmation

**Testing:**

- [ ] Write GPS to JPEG → re-read with exifr → coordinates match
- [ ] Write GPS to TIFF/WebP → re-read → coordinates match
- [ ] Other EXIF tags preserved after GPS write
- [ ] Atomic write: original file intact if write fails mid-way
- [ ] Undo restores original coordinates in both DB and file

#### 10.2 UI: Drag-to-Locate

**Tasks:**

1. Add a "Place on Map" mode (toggle button in header, or context menu on photo detail modal)
2. When active:
   - Photos without GPS appear in a sidebar list (scrollable, with thumbnails)
   - User drags a photo from the list onto the map → drops at a location
   - Drop point coordinates are written to the photo (EXIF + DB)
   - Photo marker appears on map immediately
3. For photos already on the map:
   - Click a marker → "Edit Location" button in the detail modal
   - Enters a drag mode: marker follows cursor until user clicks to confirm
   - Or: show coordinate input fields for precise entry
4. Batch placement:
   - Select multiple photos (lasso or list multi-select)
   - "Set Location for All" → click a point on the map → all selected photos get that coordinate
   - Use case: 50 photos from the same restaurant/venue

**UX:**

- Show a confirmation toast: "Location set for 12 photos"
- Show undo button in toast (reverts all 12)
- Photos that were manually placed show a small badge/icon on their marker (e.g., a pencil dot) to distinguish from EXIF-original locations

**Testing:**

- [ ] Drag from sidebar → photo appears on map at correct location
- [ ] Existing marker can be dragged to new location
- [ ] Batch placement writes to all selected photos
- [ ] Undo reverts all photos in batch
- [ ] Sidebar updates (photo removed from "unlocated" list after placement)

#### 10.3 UI: Address / Place Search

**Tasks:**

1. Add a search bar (visible in "Place on Map" mode or always available)
2. Integrate a geocoding API to convert address → coordinates:
   - **Nominatim** (OpenStreetMap) — free, no API key, rate-limited (1 req/sec)
   - Privacy-compatible: only the search query is sent, no photo data
3. User types "Eiffel Tower, Paris" → suggestions appear → select one → map centers on location
4. Then: click "Apply to selected photos" or drag photos to that point
5. Reverse geocoding (optional): when hovering a map location, show the nearest address/place name in a tooltip

**Privacy note:** Geocoding sends the _search query_ to Nominatim, not any photo data. This should be clearly communicated in the UI ("Address lookup uses OpenStreetMap. No photo data is sent.").

**Testing:**

- [ ] Search "Paris" → map centers on Paris
- [ ] Search "1600 Pennsylvania Ave" → correct coordinates returned
- [ ] Rate limiting respected (no API abuse)
- [ ] Works offline: graceful error message when no network
- [ ] Privacy disclaimer visible in UI

#### 10.4 Folder-Name Inference (Optional Enhancement)

**Tasks:**

1. When scanning a folder named e.g. "Paris 2022" or "Tokyo Trip":
   - Extract location-like strings from folder path
   - Geocode via Nominatim → suggest coordinates
   - Offer to apply to all photos in that folder that lack GPS data
2. Show as a suggestion, never auto-apply:
   - "12 photos in folder 'Paris 2022' have no GPS. Place them in Paris, France?"
   - User confirms or dismisses
3. Mark these as `location_source = 'inferred'` with a distinct visual badge

**Testing:**

- [ ] Folder "Paris 2022" → suggests Paris coordinates
- [ ] Folder "IMG_20230415" → no suggestion (not a place name)
- [ ] User can accept or dismiss suggestion
- [ ] Inferred locations visually distinct from EXIF locations

#### Implementation Order

| Step | What                               | Depends On                        |
| ---- | ---------------------------------- | --------------------------------- |
| 10.1 | EXIF GPS writing + IPC + DB column | Nothing (can start independently) |
| 10.2 | Drag-to-locate UI                  | 10.1 (needs write capability)     |
| 10.3 | Address search + geocoding         | 10.1 (needs write capability)     |
| 10.4 | Folder-name inference              | 10.3 (needs geocoding)            |

#### Estimated Effort

| Sub-phase             | Complexity  | Effort        |
| --------------------- | ----------- | ------------- |
| 10.1 EXIF writing     | Medium      | 2–3 days      |
| 10.2 Drag-to-locate   | Medium-High | 3–4 days      |
| 10.3 Address search   | Medium      | 2–3 days      |
| 10.4 Folder inference | Low         | 1 day         |
| **Total**             |             | **8–11 days** |

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

**Unit Tests (Vitest) — ✅ Implemented:**

- Core package: geographic filters (IDL crossing), combined query composition, operation planner (filename collisions), path/operation validators
- Run with `pnpm -C packages/core test` — must pass before every commit
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
- **Moved Photos Scope Decision:** When photos are moved outside originally scanned folders, decide behavior:
  - Option A: Keep tracking (current behavior) - database-centric, photos stay on map
  - Option B: Remove from database - folder-centric, clear but loses user's work
  - Option C (Recommended): Hybrid - keep tracking but mark as "external", show indicator in UI, offer to add destination as source or clean up
  - Requires UX decision before implementing
- **Operation History / Tracing UI:** Add visual history of file operations with export capability
  - Currently: Archived batches persist in database indefinitely, no UI to view them
  - Proposed: Settings panel showing past operations with "Export to JSON" option
  - Challenge: Cannot guarantee files still exist/unchanged after days/weeks - history is informational only
  - Value proposition: Transparency ("where did my photos go?"), audit trail, differentiates from file explorer
  - Implementation: Auto-prune after configurable period (30 days default), JSON export for long-term records
  - Requires decision: Is operation history a core feature or unnecessary database bloat?
