# Placemark — Implementation Plan

Step-by-step roadmap for building Placemark. See [ARCHITECTURE.md](ARCHITECTURE.md) for system design and architecture patterns.

Placemark is intended to be cross-platform: it targets Windows and macOS on desktop, and iPhone and Android devices (phones and tablets) for future mobile support. The initial realization and primary platform target for the first release is Windows; however, all design and implementation decisions should prioritize future portability so macOS and mobile ports remain practical and low-effort.

**Current Status:** ✅ Phase 0–7 Complete | 🧪 OneDrive Phase 15 (auth + import + abort + accounts UI complete) | Phase 8 pre-store | 🏪 v1.0 Store Launch | Phase 9–17 post-store

---

## 🏪 v1.0 Store Readiness Checklist

All items below must ship before Microsoft Store submission. Ordered by implementation sequence.

| #   | Feature                                                    | Phase | Status                     | Notes                                                                                                                                                                                  |
| --- | ---------------------------------------------------------- | ----- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Export** (CSV / GeoJSON / GPX)                           | 6.2   | ✅ Complete                | Core formatters + IPC + ExportSheet UI. Selection trumps view.                                                                                                                         |
| 2   | **Concurrent import** (`runWithConcurrency`)               | 8.1   | ✅ Complete                | 8-task semaphore pool; local EXIF reads + OneDrive subfolder walks in parallel. Page size 200→1000.                                                                                    |
| 3   | **Stats → Filters** (clickable format/camera rows + chips) | 7     | ⚠️ Implemented, not tested | Stats panel is now a floating glass panel (non-blocking). Format/camera rows are clickable filters. Active chips shown in strip below the header. Map controls shift to avoid overlap. |
| 4   | **"Fit timeline to view" button**                          | 7     | ✅ Complete                | Button in timeline controls bar; snaps thumbs to oldest/youngest photo in viewport                                                                                                     |
| 5   | **Freemium gating** (1 000-photo free tier + Pro unlock)   | 8.2   | ❌ Not started             | ~2 days. Pricing chosen: **$12.99 one-time**. Pro is a lifetime unlock that includes all future Pro features, with GPS editing positioned as a flagship future addition.               |
| 6   | **MSIX packaging + Store assets**                          | 8.3   | ❌ Not started             | ~2 days. Screenshots, icons, signing cert                                                                                                                                              |
| 7   | **Privacy policy page**                                    | 8.3   | ❌ Not started             | ~1 hour. Required URL for Store submission                                                                                                                                             |

**Estimated total: ~8 days of implementation work.**

**Post-v1.0 backlog (not blocking store):** Full RAW support (CR3 GPS via exiftool-vendored or custom ISOBMFF parser; thumbnail reliability for all 12 brands; cross-brand test suite).

---

**Recent Work:**

- **v0.9.0 — Stats & Filters UI overhaul (Apr 2026):** Stats panel converted from a full-height modal overlay to a non-blocking floating glass panel (matching Placemarks panel pattern). Format and camera rows in the stats panel are now interactive filters — click to toggle, activates instantly on the map. Active filter chips moved out of the header bar into a dedicated strip below it (wraps on overflow, respects stats panel width). Map controls (zoom +/−, fit) permanently positioned below the floating header, shift right when the stats panel is open. Stats button in header acts as a toggle (highlights blue when open).
- **OneDrive import (Mar 2026, pre-release):** Full metadata import pipeline — Graph API subfolder walk, photo record creation, duplicate dedup via SHA-256 + item ID, abort support, subdirectory toggle, progress reporting. `photo_issues` schema table records validation anomalies (`gps_zero`, `future_timestamp`, `invalid_timestamp`) from both local and OneDrive scans. Shared `photoMetadata.ts` normalizers used by both paths.
- **Settings: Accounts tab (Mar 2026):** New "Accounts" tab in Settings modal shows connected cloud services with email display and two-stage Disconnect. Connect OneDrive flow available without opening the scan overlay.
- **Stats panel: Library Health + Last Import (Mar 2026):** Library Stats panel now shows a "Library Health" card (metadata issue counts from `photo_issues`) and a "Last Import" card (scanned/imported/duplicates-skipped with relative time).
- **v0.8.0 — Code Quality & Cleanup (Mar 2026):** Dead parameters removed, null-coalescing correctness fixes, renderer `console.error` sweep, impossible type guard removed.
- **v0.7.5 — Camera data & Library Stats (Mar 2026):** EXIF `Make`/`Model` extracted and stored during scan; brand names normalised to title case. Camera breakdown bar chart added to Library Stats panel. `camera_make`/`camera_model` columns auto-migrated in existing databases.
- **v0.7.4 — Timeline histogram & Spider improvements (Mar 2026):** Two-layer histogram behind the timeline scrubber (GPS vs non-GPS bars). Multi-ring spider layout for dense clusters. Help modal (keyboard shortcuts). Settings polish and locale-aware formatting.
- **Phase 6.2 Complete — Export (Mar 2026):** CSV / GeoJSON / GPX export via native save dialog. Core formatters in `packages/core` (21 unit tests). ExportSheet glass popover with format picker. Export button in toolbar Tools group. Selection-trumps-view scope logic.
- **Phase 6.1 Complete — Placemarks:** Full placemarks system with `placemarks` table, PlacemarksPanel sidebar, Smart Placemarks ("This Year", "Last 3 Months"), reverse geocoding labels via Nominatim, create/rename/delete.
- **Phase 5 Complete (v0.5.0):** Full file operations execution with atomic batch semantics, undo support, and database sync. Copy/move operations fully functional with conflict detection, rollback on failure, and OS trash integration for undo.

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

**Goal:** Scan professional camera RAW formats and extract GPS/timestamps where possible. **Status: Experimental** — TIFF-based formats (NEF, ARW, DNG, CR2) generally work for GPS; CR3 GPS is unreliable; thumbnail extraction is partial. Not advertised as a v1.0 feature.

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
3. If no embedded thumbnail exists (rare), skip thumbnail generation — photo still appears on map, just with hover preview saying: RAW file, no preview

This approach is fast (no RAW decode), requires zero new dependencies, and produces good quality previews.

**Alternatives evaluated and rejected:**

| Alternative                             | Why rejected                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **dcraw.js** (Emscripten port of dcraw) | GPL-2.0 license — incompatible with Store distribution. 8 years unmaintained. Large WASM payload. |
| **LibRaw native addon**                 | Requires per-platform native compilation. LGPL/CDDL dual license. Heavy dependency.               |
| **Windows WIC via COM/PowerShell**      | Windows-only. Slow (process spawn per file). Complex IPC. Breaks cross-platform goal.             |
| **Full Sharp RAW decode**               | Not supported — Sharp/libvips cannot decode RAW sensor data.                                      |

#### Tasks

1. ✅ **Update file extension filter** in `exif.ts`:
   - Added `.cr2`, `.cr3`, `.nef`, `.nrw`, `.arw`, `.dng`, `.raf`, `.orf`, `.rw2`, `.pef`, `.srw`, `.rwl` to new `formats.ts` module
2. ✅ **Update thumbnail service** in `thumbnails.ts`:
   - Added RAW format detection using `isRawFile()`
   - Extracts embedded JPEG preview using `exifr.thumbnail()`
   - Passes JPEG buffer to `sharp()` for resize
   - Graceful fallback for RAW files without embedded thumbnails
3. ✅ **Update MIME type mapping** — added 12 RAW-specific MIME types (`image/x-canon-cr2`, etc.)
4. ⚠️ **Test with real RAW files** — needs manual testing with sample files from [raw.pixls.us](https://raw.pixls.us/)
5. ✅ **Update documentation** — README, RELEASE_NOTES, business_model.md, copilot-instructions.md updated

**Additional improvements:**

- ✅ Centralized format definitions in `formats.ts` (eliminates duplication)
- ✅ Increased default file size limit to 150MB (configurable in Settings)
- ✅ Added 64KB chunk size for RAW EXIF parsing (better reliability)
- ✅ Added unit test suite for format helpers

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

**Implementation Complete — Manual Testing Recommended:**

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
- [ ] Configurable file size limit (Settings > Advanced > Photo Scanning) works correctly

**Deliverable:** ✅ Professional camera RAW files supported with embedded thumbnail extraction and configurable file size limits.

---

### Phase 6: Placemarks & Export

**Goal:** Give users persistent geo+time filter shortcuts and let them export data in standard formats. Placemarks make the app feel polished; export reinforces the trust promise ("your data, your control"). Both provide immediate value for the Store listing.

#### 6.1 Placemarks ✅ COMPLETE

**Completed:**

1. ✅ Placemarks table in SQLite (`id, name, type, bounds_north/south/east/west, date_start, date_end, created_at, updated_at`)
2. ✅ `PlacemarksPanel.tsx` sidebar — click placemark to instantly apply filter
3. ✅ Smart placemarks: "This Year", "Last 3 Months" (with live photo counts)
4. ✅ User placemarks: create, rename, delete inline
5. ✅ Optional reverse geocoding labels (Nominatim) on placemark rows
6. ⚠️ Auto-detect vacation candidates after scan — deferred post-v1.0 (heuristic adds complexity for marginal value)

#### 6.2 Export

**Tasks:**

1. **CSV export** — tabular format: filename, date, latitude, longitude, camera make/model, folder path. Universal, opens in Excel/Google Sheets.
2. **GeoJSON export** — photo locations as a GeoJSON FeatureCollection (importable in QGIS, Google Earth, Mapbox). The standard for geo data.
3. **GPX export** — photo locations as waypoints, importable in hiking/GPS apps. Also lays groundwork for Phase 9 trip route export.
4. Add "Export" button to the toolbar with format picker
5. Export respects current filters and active placemark — export only what's visible

**Dropped formats (can revisit post-1.0):**

- ~~KML/KMZ~~ — Google Earth is niche and declining. KMZ adds significant complexity (ZIP archive, embedded thumbnails). Users can convert from GeoJSON with free tools.
- ~~Self-contained HTML map~~ — High effort (bundle Leaflet, tile handling, offline support) for a rarely-used sharing mechanism. Better alternatives exist.

**Privacy note:** All exports are local file writes. No data leaves the device.

**Testing (6.1 — complete):**

- [x] Saved placemark restores exact filter state
- [x] Deleting a placemark doesn't affect photos
- [x] Smart placemarks update automatically when new photos are scanned

**Testing (6.2 — complete):**

- [x] Core formatters (toCsv, toGeoJson, toGpx) — unit tests pass
- [x] CSV opens in Excel/LibreOffice with correct columns
- [x] GeoJSON export opens correctly in geojson.io
- [x] GPX export imports into a GPS app
- [x] Selection-aware scope: selected photos exported when selection active; map view otherwise
- [x] Export 10,000 photos in <5 seconds

**Deliverable:** ✅ Placemarks complete. ✅ Photo data export (CSV/GeoJSON/GPX) complete.

---

### Phase 7: Library Insights → Stats & Filters Panel

**Goal:** Give users statistics and insights about their photo library, and evolve the stats panel into an interactive filtering surface. The "Stats & Filters" panel is the primary entry point for non-geographic filtering (camera, format, no-GPS) and coexists with the live map without blocking it.

#### Completed ✅

1. ✅ `LibraryStatsPanel.tsx` — accessible via toolbar button, click-outside to close
2. ✅ Overview card: total photos, GPS coverage %, date coverage %
3. ✅ File Formats card: proportional CSS bar chart by MIME type (JPEG, RAW, HEIC, etc.) — no extra dependencies
4. ✅ Cameras card: top 20 make/model combos with proportional bars; `camera_make`/`camera_model` stored from EXIF
5. ✅ Date Range card: oldest/youngest photo (clickable — opens in system viewer), time span
6. ✅ Storage card: total file size, avg photo size, DB sizes, cached thumbnail count
7. ✅ Last Scanned timestamp
8. ✅ **Photos per year** — satisfied by the timeline histogram (GPS + non-GPS bars over time)
9. ✅ Format and camera rows are clickable live filters
10. ✅ Active filter chips are shown in a dedicated strip below the header
11. ✅ Stats panel uses a floating, non-blocking glass layout; map controls avoid overlap

#### Remaining Work

1. Validate format and camera filters against a real library and edge cases
2. Add a future "No GPS" filter row as the entry point for metadata-correction workflows

**Deferred:** Top locations (reverse-geocode top cluster centres) — deferred to Phase 9 trip finder.

**Testing:**

- [x] Statistics dashboard loads in <1 second for 50,000 photos
- [x] Camera breakdown shows correct make/model from EXIF
- [x] Photos-per-year distribution — covered by the timeline histogram (GPS vs non-GPS bars)
- [ ] Format and camera filters validated on a real library
- [ ] Filter chips clear correctly under repeated add/remove combinations

**Estimated Effort (remaining):** <1 day for validation and minor fixes

**Deliverable:** ✅ Floating Stats & Filters panel with overview, formats, cameras, storage, date range, health cards, and interactive filtering.

---

### Phase 8: Polish & Store Readiness

**Goal:** Production-quality app ready for Microsoft Store submission. Combines performance work, freemium gating, and packaging.

#### 8.1 Performance & Stability

**Tasks:**

1. Virtual scrolling for photo grid (handle 100k+ photos)
2. Concurrent import: `runWithConcurrency` pool for EXIF reads (local) and OneDrive subfolder walks — see SUGGESTIONS.md for full design spec
3. Incremental folder scanning (only new/modified files since last scan)
4. Memory profiling — stay under 500MB with large datasets
5. Error boundary with user-friendly crash screen
6. Cold start optimization — target <3 seconds

#### 8.2 Freemium Gating

**Pricing decision:** **$12.99 one-time**. Pro is a lifetime unlock: existing owners receive all future Pro features at no extra cost. GPS editing is the flagship future Pro capability to communicate in upgrade flows.

**Tasks:**

1. Implement free tier photo limit (1,000 photos as defined in [business_model.md](business_model.md))
2. Gate launch Pro features: file operations, lasso selection, and advanced settings
3. Implement respectful upgrade modal (no dark patterns, "Not now" always available) using the copy in [business_model.md](business_model.md) §3.3, including: **"Unlock Pro — $12.99"**, **"Includes all future Pro features"**, and **GPS editing included when it ships**
4. Microsoft Store durable add-on licensing integration
5. License check: periodic Store API query, cache locally, degrade gracefully if Store unavailable

#### 8.3 Store Packaging & Assets

**Tasks:**

1. Build as MSIX package (required for Microsoft Store)
2. Test in Windows Sandbox (clean install behavior)
3. Prepare Store listing assets:
   - 5 screenshots (map view, timeline, hover preview, settings, file operations)
   - 1 hero image (1920×1080)
   - App icon at required sizes
   - Store description (see [store.md](store.md))
4. Privacy policy page (GitHub Pages or similar)
5. App signing certificate
6. User documentation / in-app help screen

**Testing:**

- [ ] MSIX installs and runs correctly on clean Windows 10/11
- [ ] Free tier limits enforced correctly (1,000 photo cap)
- [ ] Pro unlock activates immediately after purchase
- [ ] Pro features disabled on refund / license expiry
- [ ] App launches in <3 seconds
- [ ] Memory usage <500MB with 100,000 photos
- [ ] Incremental scan only processes new files
- [ ] All features work in packaged (non-dev) build

**Estimated Effort:** 5–7 days

**Deliverable:** Store-ready MSIX package with freemium licensing.

---

### 🏪 MILESTONE: Microsoft Store Launch (v1.0)

**At this point, Placemark ships to the Microsoft Store.**

The app includes: local folder scanning, RAW format support, interactive map with clustering, timeline with playback, file operations (copy/move/undo), export in 3 formats, saved placemarks, library statistics, and a clean freemium model.

**Launch checklist:**

- [ ] All Phase 0–8 features working and tested
- [ ] MSIX package passes Windows App Certification Kit (WACK)
- [ ] Store listing submitted with screenshots, description, privacy policy
- [ ] Landing page live on GitHub Pages
- [ ] 60-second demo video uploaded to YouTube
- [ ] Launch posts prepared for 2–3 communities (see [business_model.md](business_model.md) §7)

**Post-launch priority:** Respond to Store reviews, fix critical bugs, then proceed with Phase 9+.

---

_All phases below are post-Store-launch. Priority order may shift based on user feedback, Store analytics, and community requests._

---

### Phase 9: Trip Detection & Route Visualization

**Goal:** Automatically group photos into "trips" and visualize travel routes on the map. This is Placemark's strongest differentiator — turning a photo map into a travel narrative.

#### 9.1 Trip Detection

**Tasks:**

1. Implement trip detection algorithm in `packages/core`:
   - Sort photos chronologically
   - Detect trip boundaries: temporal gap >24 hours OR geographic distance >50km between consecutive photos
   - Configurable thresholds in settings
2. Store trips in SQLite (`trips` table: id, name, start_date, end_date, photo_count, bounds)
3. Auto-name trips via reverse geocoding of the geographic center (Nominatim): "Berlin, Jan 2024"
4. Trips sidebar: list of detected trips, click to filter map + timeline to that trip
5. Manual trip editing: merge, split, rename, delete trips

#### 9.2 Route Visualization

**Tasks:**

1. Connect photos within a trip chronologically with polylines on the map
2. Line styling: color by speed/density, animate during timeline playback
3. Route playback: "Watch your trip unfold" — animated marker moves along the route
4. Export trip route as GPX track (builds on Phase 6.2 GPX export infrastructure)

**Testing:**

- [ ] Trip detection correctly separates a Europe trip from daily home photos
- [ ] Trips with <3 photos are handled (single-point "trips" vs. minimum threshold)
- [ ] Route lines connect photos in correct chronological order
- [ ] Route animation plays smoothly during timeline playback
- [ ] Trip rename and merge work correctly
- [ ] GPX export of trip route imports into hiking apps
- [ ] Performance: trip detection on 50,000 photos completes in <5 seconds

**Estimated Effort:** 4–5 days

**Deliverable:** Automatic trip detection with route visualization on the map.

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

### Phase 11: Duplicate Detection (Pro Feature)

**Goal:** Find and manage duplicate photos across scanned folders. Common problem for photographers who import to multiple locations or maintain multiple backups.

**Tasks:**

1. **Exact duplicate detection** — SHA-256 hash of file content. Fast, no false positives.
2. **Near-duplicate detection** — Perceptual hash (pHash or dHash) to find visually similar photos (different resolution, re-encoded, slightly cropped). Use a lightweight JS implementation (e.g., `imghash` or custom dHash).
3. Store hashes in the photos table (`file_hash` TEXT, `perceptual_hash` TEXT columns)
4. Compute hashes during scan (or as a separate "Find Duplicates" action)
5. **Duplicate review UI:**
   - Group duplicates in a list/grid view
   - Side-by-side comparison: resolution, file size, date, format, folder
   - "Keep best quality" suggestion (highest resolution, largest file size)
   - Bulk action: move duplicates to trash or a designated folder
6. Dry-run preview before any deletion (consistent with file operations UX)

**Testing:**

- [ ] Exact duplicates (same file copied to two folders) detected correctly
- [ ] Near-duplicates (same photo at different resolutions) detected
- [ ] Non-duplicates with similar content (e.g., burst shots) not falsely flagged
- [ ] Performance: hashing 10,000 photos in <2 minutes
- [ ] Duplicate removal uses trash (reversible)
- [ ] Stats shown: "Found 342 duplicates using 2.1 GB"

**Estimated Effort:** 3–4 days

**Deliverable:** Duplicate detection with review UI and safe removal.

---

### Phase 12: Folder Watch (Auto-Scan)

**Goal:** Opt-in automatic detection of new photos in scanned folders.

> **Note on network paths:** Placemark requires no special network share support. Network-mounted folders (NAS, UNC paths like `\\server\share`, SMB/NFS mounts) are surfaced by the OS and Electron's Node.js runtime as ordinary file system paths. Placemark already reads any path the user provides — network locations work out of the box. No dedicated integration is needed.

**Tasks:**

1. Use `fs.watch` or `chokidar` to monitor scanned folders for new files
2. When new photos detected, show a non-intrusive notification: "12 new photos in D:\Photos. Scan now?"
3. User must click to trigger scan (respects "no background operations" principle)
4. Toggle per folder in Settings
5. Handle folder deletion and rename gracefully

**Testing:**

- [ ] Folder watch detects new files within 5 seconds
- [ ] No automatic scanning — only notification + user-triggered
- [ ] Watch survives app minimize/restore

**Estimated Effort:** 1–2 days

**Deliverable:** Opt-in folder monitoring with user-triggered incremental scan.

---

### Phase 13: Import & Integrations

**Goal:** Import photo metadata from external sources, making Placemark a natural landing place for users leaving other platforms.

#### 13.1 Google Takeout Import

**Tasks:**

1. Parse Google Takeout `.json` sidecar files that accompany exported photos
2. Extract GPS coordinates, timestamps, and descriptions from JSON
3. Match JSON sidecars to photo files by filename
4. Apply imported metadata to photos already in the database (or import new)
5. Handle edge cases: mismatched filenames, missing JSON files, duplicate entries

#### 13.2 Apple Photos Export Import

**Tasks:**

1. Parse Apple Photos library export structure
2. Handle `.AAE` edit sidecar files
3. Map Apple's metadata format to Placemark's schema

#### 13.3 XMP Sidecar Support

**Tasks:**

1. Read `.xmp` sidecar files alongside RAW/JPEG files
2. Extract: star ratings, color labels, keywords/tags, GPS corrections
3. Display imported tags in photo detail modal (read-only initially)
4. XMP GPS data overrides embedded EXIF GPS when present (user-configurable)

**Testing:**

- [ ] Google Takeout JSON → GPS applied to matching photos
- [ ] Handles Takeout exports with thousands of JSON files
- [ ] XMP sidecar GPS data read correctly
- [ ] XMP star ratings visible in photo detail
- [ ] Graceful handling of malformed/missing sidecar files
- [ ] Mixed import: folder with photos + JSON + XMP all processed correctly

**Estimated Effort:** 4–5 days

**Deliverable:** Import from Google Takeout, Apple Photos, and XMP sidecars.

---

### Phase 14: Bulk Timestamp Correction (Pro Feature)

**Goal:** Fix incorrect photo timestamps — a common problem when camera clocks are wrong or timezone wasn't updated during travel.

**Tasks:**

1. Select photos → "Adjust Timestamps" action
2. **Time shift:** Add or subtract hours/minutes from all selected photos (e.g., "camera was 6 hours behind")
3. **Timezone correction:** Change the timezone interpretation without altering the local time (e.g., photos taken in Tokyo but tagged as UTC)
4. Dry-run preview: show before/after timestamps for all affected photos
5. Write corrected timestamps to EXIF data in files (atomic write, same safety as GPS editing in Phase 10)
6. Update database after successful EXIF write
7. Undo support: restore original timestamps from history

**Testing:**

- [ ] Shift +6 hours → re-read EXIF → timestamps correct
- [ ] Timezone change doesn't alter local time appearance
- [ ] Batch of 500 photos corrected in <30 seconds
- [ ] Undo restores original timestamps
- [ ] Dry-run shows accurate before/after preview
- [ ] Other EXIF fields preserved after timestamp write

**Estimated Effort:** 2–3 days

**Deliverable:** Batch timestamp correction with EXIF writeback and undo.

---

### Phase 15: OneDrive Integration

**Goal:** Scan OneDrive photos via Microsoft Graph API.

**Tasks:**

1. [x] Register app in Azure portal (multitenant + personal Microsoft accounts)
2. [x] Implement OAuth flow with localhost redirect (`http://localhost:3001/oauth/callback`)
3. [x] Implement `packages/desktop/src/main/services/onedriveAuth.ts`
4. [x] Implement `packages/desktop/src/main/services/onedriveGraph.ts` folder-browse slice
5. [x] Add minimal OneDrive browser to Add Source overlay (connect, root, camera roll, subfolder traversal)
6. [ ] Add candidate count preview for selected OneDrive folder (pre-import; `folder.childCount` is used during import for live progress totals, but not yet surfaced in the folder browser UI)
7. [ ] Import photo metadata via Graph pagination (no full file download)
8. [ ] Store with `source_type='onedrive'` and OneDrive item identifiers
9. [ ] Harden network and token-expiry error paths for scan/import

**Testing:**

- [x] OAuth flow completes successfully
- [x] Can browse OneDrive folders from renderer via IPC
- [ ] Can list OneDrive photos (file metadata scan stage)
- [x] Tokens stored securely (safeStorage API)
- [x] Token refresh works automatically for auth/browse operations
- [ ] Handles OneDrive API rate limits during large imports

**Estimated Effort:** 4–5 days

**Deliverable:** OneDrive photos appear on map alongside local photos.

---

### Phase 16: Advanced Features

**Goal:** Quality-of-life features for power users and specific use cases.

#### 16.1 Offline Map Tiles

**Tasks:**

1. Download map tile regions for offline use (e.g., "Download Europe at zoom 1–12")
2. Switch between online and offline tile sources in Settings
3. Store tiles in a local directory (configurable location)
4. Essential for air-gapped setups or NAS-only users

#### 16.2 Multi-Library Support

**Tasks:**

1. Support multiple independent databases (e.g., "Family Photos" vs. "Professional Work")
2. Each library has its own SQLite file and scanned folder list
3. Library switcher in the app header
4. Libraries are fully isolated — no cross-library queries

#### 16.3 Photo Calendar View

**Tasks:**

1. Month/year grid showing days with photos highlighted
2. Click a day → filter map to that day's photos
3. Heat-map coloring (more photos = darker cell)
4. Complements the timeline slider with a different temporal navigation style

**Testing:**

- [ ] Offline tiles render when network is disconnected
- [ ] Tile download progress shown with cancellation support
- [ ] Library switch loads correct database and folders
- [ ] Calendar highlights match actual photo dates
- [ ] Calendar view handles years with no photos gracefully

**Estimated Effort:** 5–7 days

**Deliverable:** Offline maps, multi-library support, and calendar navigation.

---

### Phase 17: Mobile Foundation (Future)

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

**Phase 1–3 (MVP):**

- Scan 10,000 photos in <30 seconds
- Map renders 10,000 markers with clustering
- Filter 10,000 photos in <100ms

**Phase 8 (Store Launch):**

- Handle 100,000 photos without performance degradation
- Package size <150MB
- Cold start <3 seconds
- Free→Pro conversion rate ≥1%

**Phase 15 (OneDrive):**

- Connect to OneDrive in <30 seconds
- Scan 1,000 OneDrive photos in <2 minutes

## Backlog / Future Enhancements

- **Video File Support (MP4, MOV):** Smartphones embed GPS coordinates in video files the same way they do in photos — stored in the MP4/MOV container's metadata box (not EXIF, but equivalent lat/lon/altitude). Samsung Gallery, Apple Photos, and Google Photos all surface map views for videos. Placemark should support this too.
  - **Extraction:** `exifr` does not parse video GPS. Use `ffprobe` (bundled with ffmpeg) to read the `©xyz` / `GPS ` metadata atom from MP4/MOV files. Alternatively evaluate `mp4box.js` (pure JS, no native binary).
  - **Thumbnails:** Extract a representative frame using `ffmpeg` (e.g. frame at 1s), then resize with `sharp` — same pipeline as RAW.
  - **Formats in scope:** MP4 (`.mp4`), QuickTime (`.mov`), and potentially 3GP (`.3gp`) for older Android clips.
  - **UI impact:** Video markers need a visual distinction from photo markers (e.g. a small play icon overlay). The preview panel should show the extracted frame, not attempt inline playback.
  - **Dependency decision required:** Bundling ffmpeg adds ~80–120 MB to the installer. Evaluate `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` vs. requiring ffmpeg on PATH vs. a pure-JS fallback.
  - **Schema:** Add `media_type TEXT DEFAULT 'photo'` column (`'photo'` | `'video'`), and update `mime_type` to include `video/mp4`, `video/quicktime`, etc.
  - **Phase suggestion:** Phase 12.5 or a dedicated Phase 18, after mobile foundation.

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
  - → Tracked in SUGGESTIONS.md
  - Implementation: Auto-prune after configurable period (30 days default), JSON export for long-term records
  - Requires decision: Is operation history a core feature or unnecessary database bloat?
- **macOS App Store:** Revisit if Windows Store traction exceeds 1,000 downloads/month (see [business_model.md](business_model.md) §9)
