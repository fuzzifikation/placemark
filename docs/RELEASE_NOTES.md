# Release Notes

## v0.9.2 - File Operations Safety & Hover UX (Apr 2026)

### 🐛 Fixed

- **Scan progress throttled:** Progress events now fire every 100 files (or on completion) instead of every single file. Reduces IPC overhead significantly for large libraries.
- **Scan progress rate now accurate:** `rate` (photos/s) and ETA are computed after file processing completes, not before — `processed` count is now always accurate.
- **Duplicate detection strengthened:** The "file already at destination" check now requires both byte size AND EXIF capture date to match before marking a file as skipped. Previously, two distinct photos with the same filename and coincidentally equal byte count would be silently skipped during a copy/move operation — one could be lost. Files with no EXIF date fall back to the previous size-only check with a warning added.
- **Silent DB path update failure surfaced:** After a move operation, if any photo path could not be updated in the database (e.g. due to a DB lock or concurrent modification), this is now reported in the result message. Previously the error was logged only — photos would appear missing in the app with no explanation.
- **Undo history cleared on restart — now notified:** When Placemark archives the previous session's undo history on startup, a toast is shown: "Undo history from your previous session has been cleared." Previously the Undo button simply vanished with no explanation.
- **Missing local file detected on hover:** Hovering over a map marker for a local photo that no longer exists on disk now shows "File not found — Re-scan to update" in the hover tooltip instead of a generic "No preview" placeholder.

## v0.9.1

### 🛠️ Internal

- **`calcStats` replaces `calcEta`:** Single function returns both `eta` and `rate`; used by both the local scan and OneDrive import paths with no duplication.
- **`archiveCompletedBatches` returns count:** Used at startup to conditionally set a one-shot IPC flag (`ops:wasUndoHistoryCleared`) consumed by the renderer on mount.
- **`photos:checkFileExists` IPC handler:** Lightweight `fs.access` check, local photos only. OneDrive photos are skipped (network absence is indistinguishable from deletion).

### 🐛 Fixed

- **Schema CHECK constraint for `gps_nan`:** Photos with NaN GPS coordinates now record the issue correctly instead of crashing the INSERT.
- **NaN GPS detection in scan pipeline:** `normalizeGps()` now rejects `NaN`/`Infinity` coordinates as a `gps_nan` issue (tracked in `photo_issues`). Export formatters (CSV, GeoJSON, GPX) use `Number.isFinite()` as defense-in-depth.
- **Placemark rename preserves geo-label:** Renaming a placemark no longer wipes its reverse-geocoded label. `geo_label` is only cleared when bounds actually change.
- **Scan progress double-counting:** Skipped-large-files are no longer counted in both `processedFiles` and `errors`.
- **"1 years" → "1 year":** `formatSpan` now uses singular form correctly.
- **Issue list stale after scan:** The expanded issue list in LibraryStatsPanel now resets and refetches when a scan completes.
- **Nominatim rate limit race condition:** Concurrent IPC geocode calls are now serialized via a promise chain — no more bypassing the 1 req/sec policy.
- **macOS `before-quit` cleanup:** Databases now close cleanly on Cmd+Q (not just on window close).
- **macOS dock reopen crash:** Closing all windows on macOS no longer shuts down DB services; reopening from the dock works correctly.
- **`useExportData` null deref:** Removed unsafe `visiblePhotos!` non-null assertions; uses `(visiblePhotos ?? [])` fallback.
- **WAL files deleted on wipe:** `wipeAndRestart` now deletes `-wal` and `-shm` journal files alongside `.db` files.
- **`clearAllPhotos` transaction safety:** The 3 DELETE statements (plus `photo_issues`) are now wrapped in a single transaction.
- **Placemark input validation:** IPC handlers now validate bounds geometry, name, and date ordering before writing to DB.
- **Toast ID collision:** Uses incrementing counter instead of `Date.now()`.
- **`useReverseGeocoding` stale closure:** `onLabelPersisted` callback stored in a ref to avoid stale captures.
- **`useCallback` unstable deps:** `usePlacemarkActions` and `useTimelineActions` now list specific stable refs instead of whole objects.

### 🛠️ Internal

- **`BoundingBox` → `PlacemarkBounds`:** Unified duplicate interfaces; `BoundingBox` is now a re-export alias.
- **Shared `getBasename`:** Extracted to `core/src/utils.ts`; used by all three export formatters and the operation planner (was duplicated 4×).
- **`temporal.test.ts`:** 12 new tests for `getDateRange` and `isPhotoInDateRange` (empty array, all-null, single photo, boundaries, negatives). Core tests: 46 → 58.
- **Test helper completeness:** All core test helpers now include all required `Photo` fields (cloud, camera).
- **Dead code removed:** `AdvancedSettings.tsx`, `TimelineSettings.tsx` (never imported), `updateSetting` (never used), dead exports (`ExportFormat`, `ExecutionProgress`, `ExecutionResult`, `isSupportedImageFile` re-export).
- **`locationLabelCache`** capped at 500 entries (was unbounded).
- **Refactored `storage.ts`:** Split into `storageConnection`, `photoQueries`, `batchQueries`, `libraryStats` with barrel re-export.
- **`App.tsx` complexity:** Extracted hooks (`useScanActions`, `useTimelineActions`, `usePlacemarkActions`, `useExportData`) and `FilterChipStrip` component.
- **Version mismatch detection:** New `VersionMismatchModal` warns users when DB was created by a different version.

### ⚠️ Database Rebuild Required

Schema changed (`photo_issues` CHECK constraint). Delete `placemark.db` and re-scan your sources.

---

## v0.9.0 - Stats & Filters UI Overhaul (Apr 2026)

### ✨ Added

- **Interactive format & camera filters:** Format and camera rows in the Stats panel are now clickable filters. Click a row to filter the map to only those photos; click again to remove. Multiple filters stack (OR logic within a dimension). Active filters take effect instantly on the map.
- **Non-blocking Stats panel:** The Stats panel is no longer a full-height modal overlay. It is now a floating glass panel anchored below the floating header on the right side — identical in behaviour to the Placemarks panel. The map, timeline, and all other controls remain fully accessible while the panel is open.
- **Filter chip strip below the header:** Active format/camera filter chips moved out of the header bar into a dedicated strip positioned just below it. Chips wrap onto additional lines if many are active, and the strip respects the Stats panel width so nothing overlaps.
- **Stats button toggles the panel:** The button in the header now lights up blue when the panel is open and dismisses it on a second click — consistent with the Placemarks and Timeline toggles.
- **Map controls shift when Stats panel is open:** The zoom +/− and fit-to-content buttons shift left to stay fully visible whenever the Stats panel is open.
- **Map controls permanently below the header:** The right-side map controls now always start vertically below the floating header, ensuring they never clip under it.
- **Blazing-fast concurrent import:** Local EXIF reads and OneDrive subfolder walks now run with up to 8 parallel tasks (semaphore pool). OneDrive page size increased from 200 → 1,000 items per request.
- **Auto-fit map after import:** When a scan or OneDrive import finishes, the map automatically fits to show all imported photos.
- **"Fit timeline to view" button:** New button in the timeline controls bar. Snaps both timeline thumbs to the oldest and youngest photo currently visible in the map viewport.
- **Export to CSV / GeoJSON / GPX:** New **Export** button in the toolbar. Selection-aware scope. Native save dialog — no data leaves the device. Core formatters in `@placemark/core` with 21 unit tests.
- **Export filename from oldest photo:** The suggested filename uses the date of the oldest photo being exported.

### 🛠️ Internal

- `LibraryStatsPanel` refactored: stripped `position: fixed` overlay, adopts `getGlassStyle` + parent-fill pattern. Added `glassBlur` / `glassSurfaceOpacity` props.
- `MapView`: new `rightPanelWidth` and `rightPanelTopPx` props drive CSS injected for `.maplibregl-ctrl-top-right` margin; only the first control group receives the full top offset.
- `FloatingHeader`: `onStatsOpen` renamed `onStatsToggle`; `showStats` prop added; filter chip rendering removed (chips now in `App.tsx`).
- `LAYOUT` constants: `STATS_PANEL_WIDTH: '320px'` / `STATS_PANEL_WIDTH_PX: 320` added.

---

## v0.8.0 - Code Quality & Cleanup (2026-03-22)

### 🛠️ Internal

- **Dead parameter removed:** `_showHeatmap` parameter dropped from `addClusterLayers` — it was never read; both call sites updated.
- **Null-coalescing correctness:** All `|| null` coercions in `photoFromProps` replaced with `?? null` — prevents empty strings (e.g. `cloudFolderPath: ""`) from being incorrectly discarded.
- **Impossible type guard removed:** `|| photo.timestamp === undefined` check in `temporal.ts` — `Photo.timestamp` is typed `number | null`; `undefined` cannot occur.
- **Renderer `console.error` sweep:** Removed all redundant `console.error` calls across renderer files (`OperationsPanel`, `useHistogram`, `useMapHover`, `StorageSettings`, `DryRunPreview`, `PhotoPreviewModal`, `useLibraryStats`). Errors that are user-visible via toast remain; non-critical failures now degrade silently.
- **Unused function parameter removed:** `_folderPath` parameter dropped from `DryRunPreview.handleShowInFolder`.

## v0.8.1 - OneDrive Import + Library Health (Mar 2026)

### ✨ Added

- **OneDrive OAuth login (desktop):** System-browser Microsoft login using Authorization Code + PKCE with fixed loopback callback `http://localhost:3001/oauth/callback`.
- **Secure credential handling:** OneDrive credentials are persisted locally using Electron `safeStorage` encryption and removed immediately on disconnect.
- **Main-process OneDrive browse service:** Minimal Graph folder browsing API for root folders, Camera Roll lookup, and child-folder traversal.
- **Add Source integration:** Scan overlay supports OneDrive path with connect, browse, and folder select + metadata import flow.
- **OneDrive metadata import:** Folder and subfolders are walked via Graph API; photo records (GPS, timestamp, camera make/model, cloud item ID, SHA-256 hash) are written to SQLite. Duplicate detection guards re-imports.
- **OneDrive abort:** Stop button in the scan overlay now correctly cancels an in-progress OneDrive import (module-level `abortRequested` flag checked at each item and subfolder boundary). `useFolderScan.abortScan` is the single abort call site regardless of source — it branches on an `activeSource` ref (`'local' | 'onedrive' | null`).
- **Subdirectory toggle shared:** The "Include subdirectories" toggle in the scan overlay now appears for both local and OneDrive import modes.
- **Accounts tab in Settings:** New "Accounts" tab (cloud icon) lists connected cloud services. Shows account email when connected + two-stage Disconnect button (confirm → wipes local token). Shows "Connect OneDrive" when disconnected. Privacy note: tokens stored locally via OS secure encryption only.
- **Library Health card in Stats panel:** New card showing the count of photos with metadata issues (amber when non-zero, muted "None" otherwise).
- **Last Import card in Stats panel:** After any scan or OneDrive import, a "Last Import" card shows source, processed/imported/duplicates-skipped counts, and relative completion time.

### 🛠️ Internal

- **`photoMetadata.ts`:** New shared service (`normalizeGps`, `normalizeCameraMake`, `normalizeTimestamp`) used by both local EXIF and OneDrive import paths — eliminates duplication and ensures consistent validation rules.
- **`photo_issues` schema table:** Records validation anomalies per photo (`gps_zero`, `future_timestamp`, `invalid_timestamp`) with FK cascade. `recordPhotoIssues()` uses delete+reinsert semantics so re-scanning a fixed photo clears stale rows.
- **`LastImportSummary` singleton:** Module-level in `storage.ts`, written after each scan/import, included in `getLibraryStats()` response — no extra IPC call.

### 🔒 Security

- **Token exposure reduced:** Raw access tokens are not exposed through renderer-facing IPC.
- **Fail-closed auth behavior:** Invalid or revoked credentials transition cleanly to reconnect state.

### 📝 Notes

- **Database rebuild required:** `photo_issues` table added. Delete `placemark.db` from the app data folder and re-scan.

## v0.7.5 - Camera Data & Library Stats (2026-03-20)

### ✨ Improvements

- **Camera make/model tracking:** EXIF `Make` and `Model` fields are now extracted during scan and stored in the database. Camera brand names are normalised to title case (e.g. "SAMSUNG" → "Samsung"). Existing databases are migrated automatically via `ALTER TABLE ADD COLUMN`.
- **Camera breakdown in Library Stats:** A new "Cameras" card in the Library Stats panel shows a proportional bar chart of the top 20 make/model combinations — same visual style as the File Formats card.

---

## v0.7.4 - Timeline Histogram & Spider Improvements (2026-03-19)

### ✨ Improvements

- **Timeline histogram:** A two-layer bar chart now appears behind the range scrubber showing photo density over time. Blue bars show GPS-tagged photos; grey bars show non-GPS photos. 100 equi-temporal buckets, bars touch edge-to-edge. The controls row now shows "Showing: x of y photos" with an "All: minDate – maxDate" subtitle so the full library span is always visible.
- **Multi-ring spider layout:** Dense clusters now distribute across concentric rings instead of cramming onto one circle. Each ring's capacity is calculated so markers never visually overlap. Outer rings use multipliers of the base radius (`×1.7`, `×2.4`, `×3.1`, `×3.8`), with alternate rings staggered by a half-step angle to avoid radial alignment.
- **Spider legs render below markers:** Spider leg lines now draw underneath photo pins so inner-ring markers are always clearly visible.
- **Help modal:** A `?` button in the floating header opens a keyboard shortcuts reference covering Selection Mode and Map Navigation.

### 🐛 Bug Fixes

- **Unused imports removed:** `PLAY_SPEEDS` import in `useTimelinePlayback.ts` and unused `showHeatmap` parameter in `mapLayers.ts` removed — TypeScript now compiles with zero errors.

---

## v0.7.3 - Settings Polish (2026-03-19)

### ✨ Improvements

- **Timeline playback speeds now configurable:** The three playback speeds (▶ / ▶▶ / ▶▶▶) are now exposed as sliders in Map → Advanced settings (defaults: 7 / 30 / 180 days per second). Previously hard-coded.
- **Map settings reorganised:** Advanced section gains clear sub-group headers (Clustering, Map, Overlapping Markers, Timeline Playback). Low-level tuning knobs moved behind a "Developer settings" toggle to reduce noise for normal users.
- **Developer settings use compact number inputs:** The 6 developer settings (map padding, max zoom, spider internals) now render as single-row number inputs instead of full-width sliders — denser and more appropriate for precise value entry.
- **Single-click pin opens system viewer:** New opt-in toggle in General settings. When enabled, clicking a map pin opens the OS default photo app directly, bypassing the in-app preview.

---

## v0.7.2 - Code Quality & Bug Fixes (2026-03-16)

### 🐛 Bug Fixes

- **Thumbnail cache size preserved on restart:** `INSERT OR REPLACE` was silently resetting the user's custom thumbnail cache size limit back to 500 MB every time the app launched. Changed to `INSERT OR IGNORE` so the value is only initialised once.
- **Cluster/point opacity settings now take effect:** Opacity values were not tracked in the applied-settings ref, so changes made in Settings were silently ignored until a full map reload. Now tracked correctly.

### 🧹 Code Cleanup (−1,042 net lines)

- **Migration system removed:** Schema is now a single `SCHEMA_SQL` constant applied via `db.exec()`. No version tracking, no runner machinery — appropriate for an alpha product where the database rebuilds in minutes.
- **Mobile scaffolding removed:** `IStorage.ts`, `queries.ts`, and `Source.ts` deleted. Mobile compatibility will be re-introduced in Phase 9 when the scope is defined.
- **Dead code removed:** Unused SQL builders, filter functions, `Photo` utility methods, UI constants, and a dead `did-finish-load` IPC handler.
- **`StorageSettings` simplified:** Removed legacy `expanded`/`onToggle` props from the `StorageSettings` component.

### 📝 Notes

- **Database rebuild required:** Schema changes mean existing `placemark.db` databases are incompatible. Delete `placemark.db` and `thumbnails.db` from the app data folder and re-scan your photo library.

---

## v0.7.1 - UI & Dependency Update (2026-03-16)

### ✨ UI Improvements

- **Redesigned control bar:** Buttons are now grouped into five logical sections separated by visual dividers, matching the natural user workflow: _Library (Clear / Add)_ → _Timeline_ → _Selection tools (Select / Organize)_ → _App utilities (Stats / Settings)_.
- **Consistent button style:** All workflow buttons now use a uniform icon + text label with an outlined style. No more mixing of text buttons and icon-only buttons within the same workflow group.
- **Better icons:** "Add" uses `FolderPlus` (folder with +); "Organize" uses `FolderOpen` — no more duplicate icons.
- **Clear label on trash:** The clear-library action now shows a "Clear" text label for consistency.

### 🔒 Security

- **Rollup CVE fixed (GHSA-mw96-cpmx-2vgc):** Pinned `rollup ≥ 4.59.0` via pnpm override to resolve an Arbitrary File Write path traversal vulnerability in the build chain.
- **electron-builder 26.8.1:** Resolves `tar` (GHSA-83g3-92jg-28cx) and `minimatch` (GHSA-3ppc-4f35-3m26) CVEs.

### 📦 Dependency Updates

- **Electron 40 → 41** with native module rebuild
- electron-builder 26.7.0 → 26.8.1
- better-sqlite3 12.6.2 → 12.8.0
- maplibre-gl 5.17.0 → 5.20.1
- lucide-react 0.563.0 → 0.577.0
- vitest 4.0.18 → 4.1.0
- vite-plugin-electron 0.29.0 → 0.29.1
- @types/node, @types/react minor updates

### 📝 Notes

- No database schema changes. No migration needed.
- Vite 7 and @vitejs/plugin-react 5 are intentionally held — vite 8 requires a dedicated testing session.

---

## v0.7.0 - RAW Format Support (2026-02-14)

📷 **Experimental support for professional camera RAW formats introduced.**

### ✨ New Features

- **RAW file scanning:** Canon (CR2, CR3), Nikon (NEF, NRW), Sony (ARW), Adobe DNG, Fujifilm (RAF), Olympus (ORF), Panasonic (RW2), Pentax (PEF), Samsung (SRW), and Leica (RWL) files are now indexed.
- **EXIF extraction from RAW files:** GPS and timestamps are read from TIFF-based RAW formats (NEF, ARW, DNG, CR2, etc.) via `exifr`. CR3 GPS extraction is unreliable.
- **Thumbnail extraction:** Embedded JPEG previews are extracted and resized where available. CR2 thumbnails may fail; CR3 thumbnails are not currently supported.
- **Graceful fallback:** Files where GPS or thumbnail extraction fails are still indexed — they appear in library counts but not on the map.
- **Increased file size limit:** Maximum file size raised from 100MB to 150MB to accommodate professional medium-format RAW files.

### 🏗️ Architecture

- **New `formats.ts` module:** Centralizes all supported format definitions (standard + RAW extensions).
- **MIME type mapping:** Added 12 RAW-specific MIME types (`image/x-canon-cr2`, etc.).
- **Optimized RAW EXIF parsing:** 64KB chunk size used for RAW files to ensure reliable EXIF header reading.
- **No new dependencies:** `exifr` already supports RAW EXIF + thumbnail extraction; `sharp` handles JPEG resize.

### 📝 Notes

- **No database schema changes:** Existing `mime_type TEXT` column accommodates new RAW MIME types.
- **No breaking changes:** All existing functionality preserved.
- **Testing recommended:** Verify EXIF extraction and thumbnail generation with sample RAW files from [raw.pixls.us](https://raw.pixls.us/).
- **RAW support is experimental:** Tested only with a small number of sample files. CR3 GPS extraction is known to be unreliable (CR3 uses a Canon ISOBMFF container not supported by exifr 7.x). CR2 thumbnails may fail on some files. Other brands are untested with real files. Full RAW support is planned for a post-v1.0 release.

---

## v0.6.1 - Spider & Icon Fixes (2026-02-10)

### 🐛 Bug Fixes

- **Spider: hovering a second stack now works.** Previously, when a spider was open, hovering a nearby un-spidered stack was blocked. Now the current spider collapses instantly and the new stack opens.
- **Windows icon: `.exe` and taskbar now show the Placemark icon.** Added a proper multi-resolution `.ico` for the Windows build and set `AppUserModelId` so the taskbar groups correctly instead of showing the default Electron icon.

### 📝 Notes

- No database schema changes. No migration needed.

---

## v0.6.0 - Locale-Aware Formatting (2026-02-08)

🌍 **Dates and numbers now respect the OS regional format setting**, not just the display language.

### ✨ New Features

- **System locale detection:** Electron's `app.getSystemLocale()` is used to detect the OS regional format (e.g. `de-DE` for German date format even when the UI language is `en-US`).
- **Locale-aware date/time formatting:** All user-facing dates use the system locale — timeline labels, photo hover previews, photo detail modals, and undo timestamps.
- **Locale-aware number formatting:** Photo counts and thumbnail statistics use locale-appropriate grouping separators.

### 🏗️ Architecture

- **New `formatLocale.ts` utility:** Centralised `formatDate()`, `formatDateTime()`, `formatDateWithOptions()`, and `formatNumber()` helpers that pass the system locale explicitly.
- **New IPC channel `system:getSystemLocale`:** Exposes `app.getSystemLocale()` from main process to renderer via the preload bridge.
- **Core `getDateString()` updated:** Accepts an optional `locale` parameter while remaining platform-agnostic.

### 📝 Notes

- Chromium (and standard Electron) derives `navigator.language` from the OS _display language_, not the regional format. Edge has special Microsoft integration; Placemark now bridges this gap explicitly.
- No database schema changes. No migration needed.

---

## v0.5.2 - Security & Quality Updates (2026-02-07)

🔒 **Dependency updates, security fixes, and GPS data validation.**

### 🔒 Security

- **Resolved `@isaacs/brace-expansion` vulnerability** (high severity — uncontrolled resource consumption). Added resolution override to force patched version 5.0.1.
- **Updated all dependencies** to latest versions: Electron 40.2.1, React 19.2.4, MapLibre GL 5.17.0, electron-builder 26.7.0, and more.
- **Zero known vulnerabilities** per `pnpm audit`.

### 🐛 Bug Fixes

- **GPS (0, 0) rejection:** Photos with exactly (0.000000, 0.000000) coordinates are now treated as having no GPS data. This coordinate is almost always a firmware/metadata error, not a real photo location.

### 📝 Documentation

- **Product Requirements Document (PRD):** Added comprehensive `prd.md` covering all functional and non-functional requirements with completion status.
- **Removed network share requirements** from PRD — the OS folder picker already handles mounted drives and UNC paths transparently.
- **Updated MV-9 requirement** to accurately reflect implemented map style support (light/dark tile adaptation).

### 🔧 Technical

- **Core package purity:** Replaced `crypto.randomUUID()` with pure JS UUID generator in core package (no Node.js dependency).
- **Dependency updates:** electron-builder-squirrel-windows 26.7.0, @electron/rebuild 4.0.3, @types/node 25.2.1, @vitejs/plugin-react 5.1.3, @types/react 19.2.13.

---

## v0.5.1 - File Operations Simplification (2026-02-05)

🧹 **Code quality refactoring:** Simplified file operations architecture, removed dead code, and fixed identical-file handling.

### 🐛 Bug Fixes

- **Identical file handling:** Files that already exist at destination with the same size are now treated as success (skip) rather than a conflict. This matches the expected behavior of "don't overwrite identical files."

### 🏗️ Architecture Improvements

- **Removed duplicate validation:** The `executeOperations` function no longer re-validates files that were already checked during dry-run. Uses `COPYFILE_EXCL` as a safety net for race conditions.
- **Removed dead code (~140 lines):**
  - Deleted unused `OperationLogEntry` interface from core
  - Deleted 6 unused `operation_log` functions from storage service
  - Removed obsolete operation log methods from `IStorage` interface
  - Deleted outdated `PHASE5_FILE_OPERATIONS.md` requirements document
- **Simplified types:** Removed unused `ConflictError` type and `'validating'` phase

### 📊 Code Metrics

| File                     | Before | After | Reduction |
| ------------------------ | ------ | ----- | --------- |
| `services/operations.ts` | 544    | 399   | -27%      |
| `services/storage.ts`    | 439    | 349   | -20%      |
| `models/Operation.ts`    | 49     | 38    | -22%      |

---

## v0.5.0 - File Operations Execution (2026-02-02)

✨ **Phase 5 Complete:** Full file copy/move execution with atomic batch operations, undo support, and database sync.

### 🎯 New Features

- **File Operations Execution:**
  - Copy and move operations now fully functional (Phase 5)
  - Atomic batch semantics: all files succeed or operation rolls back
  - Conflict detection: never overwrites existing files
  - Same-file detection: silently skips files already at destination
  - Progress tracking with file-by-file updates
  - Cross-device move support with verification

- **Undo System:**
  - Batch undo: reverse entire copy/move operation at once
  - OS Trash integration: undo copy sends files to Recycle Bin/Trash (recoverable)
  - Move undo: restores files to original location
  - Session-based: undo history clears on app restart
  - Automatic archival: old operations marked 'archived' (no indefinite undo stacking)

- **Database Synchronization:**
  - Move operations update photo paths in database
  - UI automatically refreshes after move/undo to show correct paths
  - Photos table stays in sync with actual file locations
  - Operation batches tracked with photo IDs for reliable updates

### 🏗️ Architecture Improvements

- **Core Package:**
  - Renamed `dryrun.ts` → `planner.ts` for clarity
  - Renamed `generateDryRun()` → `generateOperationPlan()`
  - Added `photoId` field to `FileOperation` type
  - Updated comments and documentation throughout

- **Database Schema:**
  - Migration v3: Added `operation_batch` and `operation_batch_files` tables
  - Migration v4: Added `photo_id` column to batch files
  - Added 'archived' status for historical operations

- **Safety Mechanisms:**
  - Pre-flight validation: checks all files before touching anything
  - Rollback on failure: completed files restored if mid-batch error
  - Cross-device copy verification: checks file size before deleting source
  - Graceful error handling: partial failures don't corrupt state

### 📝 Documentation

- **Updated plan.md:** Phase 4A complete, Phase 5 in progress
- **Added backlog items:**
  - Moved photos scope decision (keep tracking vs. remove from DB)
  - Operation history/tracing UI (export capability, auto-prune)
- **Code comments:** Modernized planner.ts documentation

### 🔧 Technical Details

- Operation flow: validate → log batch → execute → update DB → refresh UI
- Undo flow: retrieve batch → move files → update DB → mark undone → refresh UI
- Session cleanup: `archiveCompletedBatches()` runs on app startup
- UI refresh: `onRefreshPhotos` callback reloads photo data after move operations

---

## v0.4.1 - Critical Bug Fixes & Security Hardening (2026-02-02)

🔒 **Critical bug fixes and security improvements** - fixed coordinate handling bug, hardened IPC security, and improved version management.

### 🐛 Critical Bug Fixes

- **Fixed latitude/longitude 0 bug:** Photos at equator (lat=0) or prime meridian (lon=0) were incorrectly filtered out
  - Fixed in `filesystem.ts` photo counting
  - Fixed in `useMapLayerManagement.ts` map filtering
  - Now correctly handles valid coordinates like (0, 0) Gulf of Guinea
- **Fixed version reporting:** Replaced brittle `process.cwd()` package.json reads with stable `app.getVersion()`
  - Removed hardcoded fallback versions from AboutSection.tsx
  - Version now works reliably in dev and packaged builds
- **Fixed native dependency builds:** Removed `better-sqlite3` from `ignoredBuiltDependencies`
  - Added `postinstall` script to rebuild native modules for Electron's Node ABI
  - Prevents "module version mismatch" errors across Node/Electron updates

### 🔒 Security Improvements

- **IPC attack surface hardening:** Renderer now passes photo IDs instead of raw paths/objects
  - `photos:openInViewer` and `photos:showInFolder` accept `photoId`, fetch canonical path from SQLite
  - `ops:generateDryRun` accepts photo IDs array, fetches Photo objects from database
  - Added strict `opType` validation (only 'copy' or 'move')
  - Added destination path validation (absolute, writable, not system folders)
  - Prevents arbitrary path access and object injection attacks

### 📝 Documentation

- **Privacy Guarantees:** Added clear privacy statements to README and About section
  - No server backend, no uploads to Placemark infrastructure
  - All data stored locally on device
  - Map tiles loaded from internet, but no photo data transmitted
- **Version Management:** Simplified update script (3 files instead of 4)
  - Removed AboutSection.tsx from update list (uses `app.getVersion()` now)
  - Updated documentation to reflect streamlined process

### 🛠️ Developer Experience

- **Improved error messages:** IPC handlers now provide clear validation errors
- **Database helpers:** Added `getPhotoById()` and `getPhotosByIds()` functions
- **Code quality:** Zero TypeScript errors, all validation logic centralized

---

## v0.4.0 - Documentation Cleanup (2026-02-02)

📚 **Streamlined documentation** for a personal project - removed overkill corporate docs and enhanced architecture visualization.

### 📖 Documentation Changes

- **Removed Overkill Docs:** Deleted CODE_OF_CONDUCT.md, CONTRIBUTING.md, CODE_QUALITY_AUDIT.md, PR template, technologydecisions.md (unnecessary for personal project)
- **Enhanced ARCHITECTURE.md:** Added 3 professional Mermaid diagrams:
  - High-level system architecture (Electron processes, IPC flow)
  - Photo scanning sequence diagram
  - Settings persistence flow
- **Streamlined Navigation:** Clean documentation structure with README → ARCHITECTURE → plan → SETUP
- **Updated Copilot Instructions:** Reflects Phase 4A completion status

### 🎯 Philosophy

**"The architecture should speak for itself"** - Clean code with visual diagrams instead of verbose policy documents. Perfect for a personal project that values simplicity over bureaucracy.

### 📦 What Remains

- **README.md** - User manual + developer quick start
- **ARCHITECTURE.md** - System design with Mermaid diagrams ⭐
- **plan.md** - 9-phase implementation roadmap
- **SETUP.md** - Development environment setup
- **RELEASE_NOTES.md** - Version history (this file)

---

## v0.3.0 - UI Polish & Visual Feedback (2026-01-31)

🎨 **Major UI enhancements** with comprehensive visual feedback improvements and polished interactions.

### ✨ New Features

- **Enhanced Visual Feedback:** All interactive elements now provide smooth hover effects and animations
- **FloatingHeader Animations:** Buttons scale and change appearance on hover for better user experience
- **Map Marker Hover States:** Dynamic marker styling using MapLibre's feature-state API
- **Timeline Slider Improvements:** Thumbs with drag feedback animations and improved responsiveness
- **Clean Timeline Design:** Reverted to simple vertical bars for consistent, professional appearance

### 🔧 Technical Improvements

- **Type Safety:** Fixed type safety issues by replacing `any` types with proper `ThemeColors` interface
- **Performance:** Optimized hover state management for smooth 60fps animations
- **Accessibility:** Improved focus states and keyboard navigation support

### 🎯 User Experience

- **Intuitive Interactions:** Clear visual cues for all clickable elements
- **Smooth Animations:** Cubic-bezier easing functions for professional feel
- **Consistent Design:** Unified hover effects across the entire application
- **Responsive Feedback:** Immediate visual response to user actions

---

## v0.2.1 - Architectural Improvements (Unreleased)

### 🔧 Technical Improvements

- **Mobile-Ready Architecture:** Extracted all filtering logic to platform-agnostic core package
- **Storage Interface:** Created `IStorage` abstraction for future React Native compatibility
- **Component Refactoring:** Reduced App.tsx from 737 to 313 lines (58% reduction)
- **Type Safety:** Centralized Window API types in dedicated `preload.d.ts` file
- **Code Organization:** New components: `FloatingHeader`, `PhotoPreviewModal`
- **Constants Module:** Eliminated magic numbers with centralized UI constants
- **Logger Service:** Structured logging foundation (ready to replace console.log)

### 📦 New Core Modules

- `@placemark/core/filters/geographic` - Bounding box logic with IDL support
- `@placemark/core/filters/temporal` - Date range filtering
- `@placemark/core/filters/combined` - Combined geographic + temporal filters
- `@placemark/core/storage/IStorage` - Platform-agnostic database interface
- `@placemark/core/storage/queries` - SQL query builders

### 🎯 Impact

- **Phase 9 Readiness:** Core logic can now be shared with React Native mobile app
- **Maintainability:** Single-responsibility components, cleaner separation of concerns
- **Testability:** Pure TypeScript functions in core package can be unit tested
- **Scalability:** Foundation for 100k+ photo performance optimizations

---

## v0.2.0 - Alpha Release

🎉 **Second Alpha Release** with major UI improvements and Portable Mode.

## New in v0.2.0

### 🚀 Portable Mode

- Placemark is now a **portable application**. No installation required.
- All data (databases, cache) is stored in a `placemark_data` folder next to the executable.
- Perfect for running from a USB drive or keeping your system clean.

### 🎨 UI & Experience

- **Mobile-Friendly Toggles:** Replaced checkboxes with smooth switches.
- **Clustering Controls:** New settings to toggle clustering, adjust radius, and use heatmap.
- **Dark/Light Mode:** Heatmap now works beautifully on both themes.
- **Menu Bar:** Auto-hidden for a cleaner look.
- **Scrollbars:** Hidden global scrollbars for a native feel.

### 🛠️ Improvements & Fixes

- **Smart Spiderify:** Photos at the exact same location now "spider out" so you can click them individually.
- **Zoom Limit Fix:** Map no longer goes blank when zooming too far deep.
- **Thumbnail Cache:** In-memory caching for instant hover previews.
- **Database Management:** "Clear All App Data" replaced with safe "Open Data Folder" button.
- **Performance:** Optimized MapView event listeners and render logic.

## Core Features

- 📂 Scan local photo folders and extract EXIF GPS + timestamps
- 🗺️ Interactive MapLibre map with photo markers
- ⏱️ Timeline view with play controls and date filtering
- 🖼️ Thumbnail caching system (400px JPEG)
- 🔍 Hover preview tooltips on map markers

## ⚠️ Important Notes

- This is an **unsigned** Windows build - you might see a "Windows protected your PC" popup.
- Click "More info" → "Run anyway" to launch.
- This is alpha software.

## Installation

1. Download **Placemark-0.2.0-portable.exe** from Assets below.
2. Move it to a folder of your choice (e.g. `D:\MyPhotos\Placemark`).
3. Double-click to run.
4. Data will be created in `placemark_data` next to the file.

## Requirements

- Windows 10/11 (64-bit)
- ~200MB disk space for app + thumbnail cache

## Known Limitations

- Windows only
- Local folders only (OneDrive integration in Phase 7)
- No file operations yet (copy/move coming in Phase 4)

## What's Next

Phase 4 will add file operations (copy/move photos based on location/date selection).

Report issues at: https://github.com/fuzzifikation/placemark/issues
