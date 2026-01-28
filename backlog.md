# Placemark Backlog

## Current Issues

(No current issues - all known bugs and features implemented!)

## Resolved

### ✅ Portable Deployment Configuration (FIXED)

- Configured electron-builder for portable-only deployment (single .exe, no installer).
- Databases (placemark.db, thumbnails.db) stored next to .exe in portable mode.
- Dev mode uses default AppData location.
- Application icon configured (icon.png).
- Suppressed Sharp platform-specific package warnings during build.

### ✅ Database Management UI Reorganization (FIXED)

- Reorganized Database Management section in Settings for clarity.
- Photos box: Total photos count + Photos Database size.
- Thumbnail Cache box: Stats, progress bar, max size slider, and clear button (all inside box).
- Clear All Photos button standalone (red, destructive action).
- Removed duplicate information and improved hierarchy.

### ✅ Clustering Controls Reorganization (FIXED)

- Added clustering enable/disable toggle switch.
- Made cluster radius and max zoom sliders conditional (only visible when clustering enabled).
- Moved heatmap overlay option into clustering section.
- Better logical grouping of related controls.

### ✅ Settings Reactivity Improvements (FIXED)

- Fixed clustering toggle not applying immediately (added to useEffect dependencies).
- Fixed heatmap toggle not applying immediately (added to source recreation condition).
- All settings changes now apply instantly without requiring theme change or timeline manipulation.

### ✅ Toggle Switches for Mobile UX (FIXED)

- Replaced all checkboxes with modern toggle switches.
- Smooth sliding animation (0.2s transition).
- Blue when enabled, gray when disabled.
- Mobile-friendly touch targets (44px × 24px).
- Applied to: clustering enabled, heatmap overlay, auto-fit during playback.

### ✅ Map Zoom Limit (FIXED)

- Added maxZoom: 19 to map initialization to match tile source capabilities.
- Prevents zooming beyond available tiles (which caused blank map display).
- Users can no longer zoom past the point where tiles exist.

### ✅ Heatmap Feature Only Works in Dark Mode (FIXED)

- Changed color ramp from light blue palette to vibrant colors (royal blue → deep sky blue → yellow → orange → crimson).
- Now works on both light (OSM) and dark (CartoDB) tile backgrounds.

### ✅ Timeline Play Bug with Single Photo (FIXED)

- Fixed condition check: now uses `allPhotos.length` instead of `photos.length`.
- App stays on map view even when filter shows 0 photos; user can adjust filter to see photos again.

### ✅ Implausible Date in Modal View (FIXED)

- Fixed timestamp conversion: removed incorrect `* 1000` multiplication.
- EXIF service already returns milliseconds; dates now display correctly.

### ✅ Some Photos Show 'No Preview Available' (FIXED)

- Added file existence check before thumbnail generation.
- Corrupted JPEG files now fail silently (they display correctly in Windows Photo Viewer but can't be processed by sharp).
- Better error handling distinguishes between missing files and corrupted files.

### ✅ Remove Menu Bar from Main Window (FIXED)

- Added `autoHideMenuBar: true` to BrowserWindow options.
- Menu bar now hidden by default (press Alt to show if needed).
- Cleaner, more app-like appearance.

### ✅ Stop Clustering at Earlier Zoom (FIXED)

- Changed default `clusterMaxZoom` from 16 to 14.
- Individual photo markers now visible 2 zoom levels earlier.
- Better detail at mid/high zoom levels.

### ✅ Settings Window Too Large (FIXED)

- Added `maxHeight: 90vh` and `overflowY: auto` to Settings modal.
- Settings now scrollable and accessible on any screen size.
- Prevents content cutoff on smaller displays.

### ✅ Thumbnail Cache Performance (FIXED)

- Added in-memory cache (Map<photoId, objectUrl>) in MapView renderer.
- First hover per photo goes through IPC + SQLite (~200ms).
- Subsequent hovers use cached Object URL (instant, <10ms).
- No more IPC round-trip for already-loaded thumbnails.

### ✅ Photo Orientation (FIXED)

- Added `.rotate()` to sharp thumbnail pipeline to respect EXIF Orientation tag.
- Thumbnails now display correctly for photos rotated in Windows Explorer or other apps.
- Cross-platform compatible - follows standard photo app behavior.

### ✅ Database Management in Settings (FIXED)

- Added Database Management section in Settings window.
- Displays sizes for both placemark.db and thumbnails.db.
- Shows total photo count and combined database size.
- Provides clear buttons for thumbnails and photos database.
- Removed Clear Database button from main page - all database management now in Settings.

### ✅ Uninstaller Data Cleanup (FIXED)

- Added custom NSIS script for Windows installer.
- Uninstaller prompts user: "Do you want to remove all Placemark user data?"
- Lists what will be deleted: photo database, thumbnail cache, settings.
- Opt-in via Yes/No dialog - data kept by default if user clicks No.
- Removes entire `AppData\Roaming\@placemark\desktop` directory if confirmed.

### ✅ Smart Separation of Overlapping Points (FIXED)

- Implemented automatic offsetting for photos with identical GPS coordinates.
- Photos at same location are detected and arranged in a circular pattern.
- Offset distance: ~10 meters (0.0001 degrees), invisible at normal zoom but makes all markers clickable.
- Groups points by coordinates (rounded to 6 decimal places = 0.11m precision).
- First photo stays at original position, others offset in circle around it.
- All photos at identical locations now individually accessible.

## Next Version

### 1. Multi-threaded Photo Import (EXIF/Thumbnail)

- Investigate using 2–3 worker threads for EXIF extraction and thumbnail generation during folder scan.
- All database writes (insert/update) should be funneled through a single thread or queued to avoid SQLite lock contention.
- Goal: Speed up large imports while keeping database safe and consistent.

### 14. Picture Location Inference (Next Release)

- Feature: Add the ability to infer missing photo locations (GPS) for photos without GPS data.
- User should be able to select photos without GPS and trigger location inference.
- Must be opt-in and privacy-transparent (user must explicitly enable and approve each inference action).
- Ideas for inference:
  - Use folder names or parent folder structure to guess location (e.g., folder named "Paris 2022").
  - Offer to use an online service or web-based API for geolocation (e.g., reverse image search, AI-based geolocation, crowd-sourced databases).
  - Allow user to manually enter or confirm suggested locations.
- Ensure no photo is uploaded without user consent; ideally, use a service that can work with minimal data or on-device if possible.
- Show inferred locations as suggestions, allow user to accept/reject, and log all changes.
- Document the process and provide clear UI/UX for this workflow.

### 2. OneDrive Integration (Future - Phase 7)

- Authenticate with Microsoft OneDrive via OAuth (localhost redirect for desktop).
- Read-only access by default - scan OneDrive photos, extract EXIF metadata.
- Display OneDrive photos on map alongside local photos.
- Store OneDrive item IDs (not full files) in database.
- Refresh token handling for persistent access.
- Handle Microsoft Graph API rate limits gracefully.

### 3. Network-Mounted Folders Support (Future - Phase 6)

- Support scanning network shares (UNC paths on Windows: \\server\share).
- Support SMB/NFS mounts on macOS/Linux.
- Handle network timeouts and disconnections gracefully with retry logic.
- Cache scanned metadata (don't re-scan network on every app launch).
- Show network status indicator when accessing remote photos.

### 4. File Operations (Copy/Move) (Future - Phase 4-5)

- Select photos by geographic area and/or date range.
- Preview operations before execution (dry-run showing source → destination).
- Copy or move selected photos to chosen destination folder.
- Validate destination: check permissions, disk space, detect conflicts.
- Show progress bar with cancel capability.
- Transaction logging (operation_log table) for audit trail.
- Support rollback where possible for failed operations.
- Must be explicit, transparent, and reversible.

### 5. Mobile App (React Native) (Future - Phase 9+)

- Port core package logic to React Native for iOS/Android.
- Access device photo library (requires OS permissions).
- Display photos on map using react-native-maplibre.
- OneDrive OAuth via deep links or embedded webview.
- Async SQLite implementation (react-native-sqlite-storage).
- Sandboxed filesystem (user grants access per folder).
- OneDrive likely primary source on mobile (vs local folders on desktop).

### 6. Timeline Animation: Movement Lines/Swooshes

- During timeline playback, visually connect successive photos with animated lines or swooshes on the map.
- Shows the user's movement or journey from place to place over time.
- Helps users understand the sequence and flow of their travels.
- Animation should be smooth and visually appealing, but not distracting.
- Option to enable/disable in settings.

### 7. Dynamic Cluster Expansion on Hover

- When hovering over a cluster or group of photos within a small radius, animate the points outward into a circle around the cluster center.
- Optionally draw lines from each new position back to the original location to show the offset.
- Each point becomes individually clickable while expanded.
- When the mouse leaves, animate the points back to their original positions.
- Improves UX for dense photo areas and makes selection easier without permanent offset.
- Should be smooth, visually clear, and reversible.

Add new ideas, bugs, or feature requests below:

## File Operations — Requirements & Critical Evaluation (Phase 4/5)

### Summary

Goal: Let users sort photos into folders (copy/move) reliably and safely, with preview, progress, rollback where possible, and database updates. Also provide duplicate-photo detection to help consolidate collections.

### Requirements

1. Select photos on screen

- **Description:** Allow selection via map bounds, date range, timeline selection, and manual selection in the grid.
- **Acceptance:** UI shows selection count and estimated total size; selection persists during dry-run/preview.

2. Source Context Awareness (NEW)

- **Description:** Users select "dots on a map" but manipulate "files in folders". The UI must show a summary of where the selected photos currently reside before any operation is planned.
- **UI:** "Source Summary" section in Operations Panel listing the folders involved (e.g., "Selection contains 15 photos from 3 folders: \Photos\2021 (12), \Downloads (3)").
- **Acceptance:** Panel groups selected photos by parent folder, sorts by count, and displays the list to the user immediately upon opening.

3. Offer Copy / Move operations (dry-run + execute)

- **Description:** Provide a dry-run preview (source → destination mapping) that detects conflicts, previews renames, and estimates disk usage; allow user to confirm before executing.
- **Acceptance:** Dry-run must run without modifying files; execute must perform copy or move with progress, cancellation, and error reporting.

3. Super-reliable execution (safety-first)

- **Description:** File operations must avoid data loss. Use copy-then-verify semantics for `move` (copy then delete only after verification) and atomic database updates. Keep an `operation_log` with status `pending|completed|failed` and per-file errors.
- **Acceptance:** No user-visible data loss in tested failure scenarios (power loss, partial network failure); failed items are logged and retriable.

4. Update Placemark database

- **Description:** After successful copy/move, update photo records to reflect new `source`/`path`, update thumbnails if file moved, and record operations in `operation_log` table. Support transactional semantics for DB updates tied to operation outcome.
- **Acceptance:** DB remains consistent after partial failures; operations have idempotent updates and clear audit trail.

5. Duplicate detection

- **Description:** Detect duplicate photos (exact file-hash and configurable heuristics: same hash, similar filesize+timestamp, image-similarity optional). Provide UI to list duplicates and offer actions (delete, move, link, keep both).
- **Acceptance:** Duplicate detector runs as a background task; user must explicitly approve destructive actions.

### Critical Evaluation / Risks & Mitigations

- **Risk — Data loss on move:** Moves are destructive if implemented as rename. Mitigation: implement move as copy → verify checksum or size → delete source only after verification; offer a `dry-run` and a `safe move` toggle.
- **Risk — Partial failure & rollback:** Filesystem operations may partially complete (e.g., power loss). Mitigation: maintain `operation_log` with per-file status and implement resume/retry logic. Where possible, support rollback by deleting newly copied files if operation marked failed before completion.
- **Risk — Performance with large selections:** Copying thousands of files can be slow. Mitigation: stream operations with concurrency limits, show estimated time/bytes, and allow background execution with progress via IPC; prioritize UI responsiveness.
- **Risk — Disk space & permissions:** Destination may lack space or be read-only. Mitigation: preflight checks in dry-run (available space, write test), show clear warnings, and block execution when checks fail unless user overrides explicitly.
- **Risk — Conflicts & naming collisions:** Files with same name exist at destination. Mitigation: dry-run shows conflict resolution options (skip, overwrite, rename with suffix, prompt per-file); provide consistent, auditable renaming rules.
- **Risk — DB inconsistency:** If filesystem changes succeed but DB update fails, the app view may diverge. Mitigation: persist operation metadata first, mark `pending`, perform file ops, then atomically update DB rows and mark `completed`; include compensation steps if DB update fails (flagged items for manual reconciliation).
- **Risk — Duplicate detection false positives:** Heuristics may misclassify similar but distinct photos. Mitigation: default to conservative rules (exact hash first), present candidates to user with thumbnails and metadata, and require explicit user approval for destructive actions.

### Implementation Notes / Recommendations

- Implement the core planning & validation logic in `packages/core` (dry-run generator, mapping rules, validator.ts already present). Desktop should implement the actual FS engine with safe copy semantics.
- Add/extend `operation_log` table (timestamp, operation, source_path, dest_path, bytes, status, error) and surface in Settings → Database for audit and retry.
- Keep copy/move engine incremental and resumable; record progress frequently to DB so cancellation and resume are possible.
- Duplicate detection: start with SHA-256 file hashes + size + timestamp; add optional perceptual hashing (pHash) later as opt-in.
- Tests: add integration tests for dry-run mapping, conflict detection, safe-move semantics, and DB consistency under simulated failures.

### Acceptance Criteria for Phase 4 (Dry-run) & Phase 5 (Execution)

- Phase 4 (Dry-run): User can select photos, choose destination, view full source→dest preview with conflict detection, and see total count/size and warnings (permissions/space). Execute button disabled.
- Phase 5 (Execution): User can run copy/move with progress, cancel, resume failed items, and see `operation_log` entries. Database updates happen reliably and are auditable.

---
