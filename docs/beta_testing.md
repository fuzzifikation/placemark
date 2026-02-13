# Placemark — Beta Testing Checklist

> **Version:** 0.6.1  
> **Date:** 2026-02-13  
> **Goal:** Verify all features work reliably before Store preparation.

Use this checklist to systematically test every feature. Mark each item as you go.
If something fails, note the exact steps and behavior in the **Notes** column.

---

## 1. First Launch & Empty State

| #   | Test                              | Expected                                                                                                | ✅  | Notes |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | --- | ----- |
| 1.1 | Launch the app for the first time | Window opens (1200×800), no crashes, no console errors                                                  |     |       |
| 1.2 | Verify empty state UI             | Shows "Placemark" title, tagline, "Include subdirectories" toggle (ON by default), "Scan Folder" button |     |       |
| 1.3 | Check dark mode on first launch   | App respects OS theme preference                                                                        |     |       |
| 1.4 | Click Settings gear               | Settings modal opens with 6 sections in sidebar                                                         |     |       |
| 1.5 | Check About section               | Shows correct version (0.6.1), GitHub link works                                                        |     |       |
| 1.6 | Close Settings                    | Modal closes cleanly, map is behind it                                                                  |     |       |

---

## 2. Folder Scanning

Prepare test folders:

- **Folder A:** 20–50 photos with GPS data (smartphone photos work best)
- **Folder B:** 10+ photos without GPS data
- **Folder C:** A mix of formats: JPEG, PNG, HEIC, TIFF, WebP
- **Folder D:** A folder with 500+ photos (performance test)
- **Folder E:** An empty folder
- **Folder F:** A folder with files > 100 MB

| #    | Test                                        | Expected                                                                                     | ✅  | Notes |
| ---- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | --- | ----- |
| 2.1  | Scan Folder A (with subdirs ON)             | Folder picker opens, scan runs, progress bar shows file count + ETA + current filename       |     |       |
| 2.2  | Verify scan results                         | Results panel shows: folder path, total files, photos with location, photos without location |     |       |
| 2.3  | Check map after scan                        | Markers appear at correct locations, map auto-fits to bounds                                 |     |       |
| 2.4  | Scan same folder again                      | No duplicates — count stays the same (upsert logic)                                          |     |       |
| 2.5  | Scan Folder B (no GPS)                      | Reports "0 photos with location", map stays empty (or retains previous markers)              |     |       |
| 2.6  | Scan Folder C (mixed formats)               | All supported formats processed, count reflects actual photos                                |     |       |
| 2.7  | Scan Folder E (empty)                       | Reports 0 files found, no crash                                                              |     |       |
| 2.8  | Scan Folder F (large files)                 | Files > 100 MB are skipped with warning in error list                                        |     |       |
| 2.9  | Scan with subdirs OFF                       | Only top-level photos scanned, no recursion into subfolders                                  |     |       |
| 2.10 | Cancel scan mid-way                         | Scan stops, already-processed photos are kept in database                                    |     |       |
| 2.11 | Scan Folder D (500+ photos)                 | Progress bar updates smoothly, ETA is reasonable, completes without freezing                 |     |       |
| 2.12 | Scan a folder you don't have read access to | Graceful error message, no crash                                                             |     |       |

---

## 3. Map Interaction

Requires: At least 50 geolocated photos loaded.

| #    | Test                           | Expected                                                                                                | ✅  | Notes |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | --- | ----- |
| 3.1  | Pan and zoom the map           | Smooth, no lag, markers reposition correctly                                                            |     |       |
| 3.2  | Zoom out to see clusters       | Markers cluster into numbered circles, color-coded by density (blue/yellow/red)                         |     |       |
| 3.3  | Zoom into a cluster            | Cluster splits into individual markers at high enough zoom                                              |     |       |
| 3.4  | Hover over a marker            | Thumbnail tooltip appears within ~200ms                                                                 |     |       |
| 3.5  | Hover over a different marker  | Previous tooltip disappears, new one shows                                                              |     |       |
| 3.6  | Click a marker                 | Photo preview modal opens with correct metadata                                                         |     |       |
| 3.7  | Verify modal metadata          | Correct filename, path, GPS coordinates (6 decimal places), date (in OS locale format), file size in MB |     |       |
| 3.8  | Click "Open in Viewer"         | Photo opens in system default image viewer                                                              |     |       |
| 3.9  | Click "Show in Folder"         | File explorer opens with the photo file selected                                                        |     |       |
| 3.10 | Close modal                    | Click overlay or X → modal closes                                                                       |     |       |
| 3.11 | Toggle heatmap mode (Settings) | Markers replaced by heatmap density overlay                                                             |     |       |
| 3.12 | Toggle heatmap off             | Markers return                                                                                          |     |       |

### Spider/Overlap Tests

Requires: Multiple photos at the same GPS coordinates (e.g., photos taken at the same spot).

| #    | Test                                              | Expected                                         | ✅  | Notes |
| ---- | ------------------------------------------------- | ------------------------------------------------ | --- | ----- |
| 3.13 | Zoom into overlapping markers                     | Spider expands: markers fan out into a circle    |     |       |
| 3.14 | Hover on a spidered marker                        | Thumbnail shows for the correct individual photo |     |       |
| 3.15 | Hover a second stacked group while spider is open | First spider collapses, second opens             |     |       |
| 3.16 | Zoom out past spider trigger zoom                 | Spider collapses back to cluster                 |     |       |

---

## 4. Theme & Appearance

| #   | Test                                           | Expected                                                               | ✅  | Notes |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------- | --- | ----- |
| 4.1 | Toggle light mode                              | All UI elements switch to light theme, map tiles switch to light style |     |       |
| 4.2 | Toggle dark mode                               | All UI elements switch to dark theme, map tiles switch to dark style   |     |       |
| 4.3 | Adjust glass blur (Settings → Appearance)      | Floating header and panels become more/less blurred in real-time       |     |       |
| 4.4 | Adjust surface opacity (Settings → Appearance) | Panels become more/less transparent in real-time                       |     |       |
| 4.5 | Reset Appearance to defaults                   | Glass blur returns to 12px, surface opacity to 70%                     |     |       |

---

## 5. Timeline

Requires: Photos spanning at least several months of date range.

| #    | Test                                      | Expected                                                           | ✅  | Notes |
| ---- | ----------------------------------------- | ------------------------------------------------------------------ | --- | ----- |
| 5.1  | Click timeline button in header           | Timeline bar appears at bottom with histogram                      |     |       |
| 5.2  | Verify histogram                          | Vertical bars correspond to photo density over time                |     |       |
| 5.3  | Drag left handle to narrow date range     | Map markers update in real-time, photo count updates               |     |       |
| 5.4  | Drag right handle                         | Same — filtered markers match the selected date range              |     |       |
| 5.5  | Drag the range itself (middle)            | Entire window slides, map updates                                  |     |       |
| 5.6  | Click Play button                         | Playback starts, date range advances automatically                 |     |       |
| 5.7  | Verify playback speed cycling             | Click speed button to cycle through intervals (week/month/6-month) |     |       |
| 5.8  | Toggle auto-zoom during playback          | Map should follow/not follow the current photo cluster             |     |       |
| 5.9  | Click Pause                               | Playback stops at current position                                 |     |       |
| 5.10 | Close timeline (X button)                 | Timeline disappears, date filter removed, all photos visible again |     |       |
| 5.11 | Reopen timeline                           | Same state or reset — no crash                                     |     |       |
| 5.12 | Timeline with photos all on the same date | Should handle gracefully — no division by zero, no infinite loop   |     |       |

---

## 6. Lasso Selection

Requires: Multiple markers visible on the map.

| #   | Test                                  | Expected                                                        | ✅  | Notes |
| --- | ------------------------------------- | --------------------------------------------------------------- | --- | ----- |
| 6.1 | Click Select (lasso) button in header | Lasso mode activates, cursor changes                            |     |       |
| 6.2 | Draw a freeform shape around markers  | Enclosed markers are selected, count appears on Organize button |     |       |
| 6.3 | Shift+Drag to add to selection        | Additional markers added to existing selection                  |     |       |
| 6.4 | Alt+Drag to remove from selection     | Markers within shape are deselected                             |     |       |
| 6.5 | Press Escape                          | Selection clears                                                |     |       |
| 6.6 | Toggle lasso off                      | Selection clears, cursor returns to normal                      |     |       |
| 6.7 | Lasso with no markers enclosed        | Selection count stays 0, no crash                               |     |       |
| 6.8 | Lasso across entire visible map       | All visible markers selected                                    |     |       |

---

## 7. File Operations — Copy

**IMPORTANT:** Use test photos you can afford to lose. Work with copies, not originals.

Prepare:

- Select 5–10 photos via lasso
- Create a test destination folder (empty)

| #    | Test                            | Expected                                                                | ✅  | Notes |
| ---- | ------------------------------- | ----------------------------------------------------------------------- | --- | ----- |
| 7.1  | Click Organize button           | Operations panel opens, shows selected photo count + total size         |     |       |
| 7.2  | Verify Source Summary           | Photos grouped by source folder with counts                             |     |       |
| 7.3  | Select "Copy" operation type    | Copy radio selected                                                     |     |       |
| 7.4  | Click "Select Destination"      | Folder picker opens                                                     |     |       |
| 7.5  | Choose empty destination folder | Path appears in panel                                                   |     |       |
| 7.6  | Click "Preview Operation"       | Dry-run shows file list with source → destination, all status "pending" |     |       |
| 7.7  | Click "Execute"                 | Progress bar appears: file count, percentage, current filename          |     |       |
| 7.8  | Wait for completion             | Success toast, files exist in destination                               |     |       |
| 7.9  | Verify files in destination     | Correct filenames, correct file sizes (compare manually)                |     |       |
| 7.10 | Verify source files untouched   | Original files still in source folder                                   |     |       |

### Copy Edge Cases

| #    | Test                                                         | Expected                                            | ✅  | Notes |
| ---- | ------------------------------------------------------------ | --------------------------------------------------- | --- | ----- |
| 7.11 | Copy the same photos to the same destination again           | Dry-run shows "skipped" (same size already exists)  |     |       |
| 7.12 | Copy to a folder with a file of same name but different size | Dry-run shows "conflict", Execute button disabled   |     |       |
| 7.13 | Cancel mid-copy (use 50+ photos for time)                    | Files copied so far are rolled back (sent to trash) |     |       |
| 7.14 | Copy to a read-only folder                                   | Error message before execution                      |     |       |
| 7.15 | Copy across drives (e.g., C: → D:)                           | Works correctly (cross-device copy path used)       |     |       |

---

## 8. File Operations — Move

**IMPORTANT:** Use only test photos. Moves delete the source file.

| #   | Test                         | Expected                                                         | ✅  | Notes |
| --- | ---------------------------- | ---------------------------------------------------------------- | --- | ----- |
| 8.1 | Select "Move" operation type | Move radio selected                                              |     |       |
| 8.2 | Preview and Execute move     | Files appear in destination, removed from source                 |     |       |
| 8.3 | Verify database updated      | Photos with new paths still appear on map (re-check coordinates) |     |       |
| 8.4 | Move across drives           | Works — copy + verify size + delete source                       |     |       |
| 8.5 | Cancel mid-move              | Completed moves are rolled back (files restored to source)       |     |       |

---

## 9. Undo

| #   | Test                                            | Expected                                                             | ✅  | Notes |
| --- | ----------------------------------------------- | -------------------------------------------------------------------- | --- | ----- |
| 9.1 | After a copy: click "Undo"                      | Copied files sent to OS trash (Recycle Bin)                          |     |       |
| 9.2 | Check Recycle Bin                               | Files are there, recoverable                                         |     |       |
| 9.3 | After a move: click "Undo"                      | Files restored to original source location                           |     |       |
| 9.4 | Verify database after undo move                 | Photo paths reverted to original paths in database                   |     |       |
| 9.5 | Restart the app after an operation              | Undo is no longer available (session-based)                          |     |       |
| 9.6 | Undo when destination file was manually deleted | Graceful handling — no crash, reports partial undo or silent success |     |       |

---

## 10. File Operations — Batch Safety

| #    | Test                                                          | Expected                                                                         | ✅  | Notes |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | ----- |
| 10.1 | Select photos with identical filenames from different folders | Dry-run shows renamed files: `IMG_001.jpg`, `IMG_001 (1).jpg`, `IMG_001 (2).jpg` |     |       |
| 10.2 | Try to copy/move to a system folder (e.g., AppData)           | Rejected with error message                                                      |     |       |
| 10.3 | Try to copy/move to the same source folder                    | Rejected — same-path detection                                                   |     |       |
| 10.4 | Try to move a source into a subfolder of itself               | Rejected — dest-inside-source detection                                          |     |       |

---

## 11. Settings Persistence

| #    | Test                                         | Expected                        | ✅  | Notes |
| ---- | -------------------------------------------- | ------------------------------- | --- | ----- |
| 11.1 | Change cluster radius to a non-default value | Map updates immediately         |     |       |
| 11.2 | Restart the app                              | Setting is preserved            |     |       |
| 11.3 | Change multiple settings across sections     | All persist after restart       |     |       |
| 11.4 | Click "Reset All" in Settings footer         | All settings return to defaults |     |       |
| 11.5 | Click per-section Reset button               | Only that section resets        |     |       |

---

## 12. Map Settings

| #    | Test                       | Expected                                                | ✅  | Notes |
| ---- | -------------------------- | ------------------------------------------------------- | --- | ----- |
| 12.1 | Toggle clustering off      | Individual markers shown (may be slow with many photos) |     |       |
| 12.2 | Adjust cluster radius      | Clusters become tighter or looser                       |     |       |
| 12.3 | Adjust cluster max zoom    | Clusters break apart at different zoom levels           |     |       |
| 12.4 | Adjust map padding         | Auto-fit uses more/less edge padding                    |     |       |
| 12.5 | Adjust transition duration | Pan/zoom animations become faster/slower                |     |       |
| 12.6 | Adjust point opacity       | Markers become more/less transparent                    |     |       |

---

## 13. Storage Management

| #    | Test                                    | Expected                                                              | ✅  | Notes |
| ---- | --------------------------------------- | --------------------------------------------------------------------- | --- | ----- |
| 13.1 | Open Settings → Storage                 | Shows photos DB size (MB), thumbnails DB size (MB), total photo count |     |       |
| 13.2 | Clear thumbnail cache                   | Thumbnails cleared, size drops to ~0                                  |     |       |
| 13.3 | Hover a photo after clearing thumbnails | Thumbnail regenerates on demand                                       |     |       |
| 13.4 | Adjust max cache size                   | Setting saved, eviction triggered if current size exceeds new limit   |     |       |
| 13.5 | Click "Open App Data Folder"            | Explorer opens the correct data folder                                |     |       |
| 13.6 | Clear entire database                   | All photos removed, map cleared, count goes to 0                      |     |       |

---

## 14. Locale & Formatting

| #    | Test                                    | Expected                                                        | ✅  | Notes |
| ---- | --------------------------------------- | --------------------------------------------------------------- | --- | ----- |
| 14.1 | With OS set to English (US) locale      | Dates show as month/day/year, numbers use commas                |     |       |
| 14.2 | With OS set to German (or other) locale | Dates show as day.month.year, numbers use periods for thousands |     |       |
| 14.3 | Check timeline labels                   | Locale-formatted dates                                          |     |       |
| 14.4 | Check photo detail modal                | Date and file size formatted per locale                         |     |       |

---

## 15. Portable Mode

| #    | Test                                        | Expected                                                     | ✅  | Notes |
| ---- | ------------------------------------------- | ------------------------------------------------------------ | --- | ----- |
| 15.1 | Build the portable `.exe`                   | `pnpm -C packages/desktop build` succeeds                    |     |       |
| 15.2 | Run the portable `.exe`                     | App launches, creates `placemark_data` folder next to `.exe` |     |       |
| 15.3 | Scan photos in portable mode                | Database created inside `placemark_data`, not in AppData     |     |       |
| 15.4 | Close and reopen                            | Data persists from `placemark_data` folder                   |     |       |
| 15.5 | Copy `.exe` + `placemark_data` to USB drive | App runs from USB with all data intact                       |     |       |

---

## 16. Error Handling & Edge Cases

| #    | Test                                                   | Expected                                                                          | ✅  | Notes |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------------------------- | --- | ----- |
| 16.1 | Disconnect internet, load map                          | Map tiles fail gracefully — cached tiles show, uncached areas are blank, no crash |     |       |
| 16.2 | Scan a folder with only non-image files                | Reports 0 photos, no errors (non-image files silently ignored)                    |     |       |
| 16.3 | Scan a folder with corrupted JPEG files                | Errors listed in collapsible error panel, scan continues for other files          |     |       |
| 16.4 | Open photo that has been deleted from disk since scan  | Graceful error in "Open in Viewer" — file not found message                       |     |       |
| 16.5 | Open photo from a network path that's now disconnected | Graceful error, no hang                                                           |     |       |
| 16.6 | Resize app window very small (300×200)                 | UI remains usable or at least doesn't crash                                       |     |       |
| 16.7 | Resize app window very large (4K fullscreen)           | Map fills space, no layout breakage                                               |     |       |

---

## 17. Performance Benchmarks

Record actual numbers for your test machine:

| #     | Metric                                               | Target                               | Actual | ✅  |
| ----- | ---------------------------------------------------- | ------------------------------------ | ------ | --- |
| 17.1  | Cold start time (first launch)                       | < 3 seconds                          |        |     |
| 17.2  | Scan 500 photos                                      | < 30 seconds                         |        |     |
| 17.3  | Scan 5,000 photos                                    | < 3 minutes                          |        |     |
| 17.4  | Map render with 5,000 markers (clustered)            | Smooth pan/zoom, no visible lag      |        |     |
| 17.5  | Thumbnail hover latency (cached)                     | < 100ms                              |        |     |
| 17.6  | Thumbnail hover latency (first generate)             | < 500ms                              |        |     |
| 17.7  | Timeline filter response                             | < 200ms after drag handle release    |        |     |
| 17.8  | Memory usage (5,000 photos loaded)                   | < 500 MB                             |        |     |
| 17.9  | Copy 100 files to new folder                         | < 30 seconds (depends on disk speed) |        |     |
| 17.10 | App data folder size (5,000 photos, full thumbnails) | < 200 MB                             |        |     |

---

## 18. Security & Privacy Verification

| #    | Test                                                                | Expected                                                                | ✅  | Notes |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- | --- | ----- |
| 18.1 | Monitor network traffic during scan (use Task Manager or Wireshark) | No outgoing requests except OSM tile fetches                            |     |       |
| 18.2 | Check that no photo data appears in tile requests                   | Tile URLs are generic: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |     |       |
| 18.3 | Try opening `javascript:alert(1)` via "Open External"               | Rejected — only http/https URLs allowed                                 |     |       |
| 18.4 | Check that renderer has no Node.js access                           | `window.require` is undefined, `window.process` is undefined            |     |       |

---

## Testing Complete?

Before declaring beta-ready:

- [ ] All items in sections 1–18 pass
- [ ] No crashes encountered during any test
- [ ] All error messages are user-friendly (no raw exception text)
- [ ] Core unit tests pass: `pnpm -C packages/core test`
- [ ] App built as portable `.exe` and tested from fresh location
- [ ] Performance benchmarks are within targets

**Known gaps (acceptable for beta):**

- No E2E automated tests (manual testing covers this)
- No offline map tile caching (requires internet for new areas)
- No incremental scanning (re-scan processes all files)
- No photo grid/list view (map-only)
- Photos without GPS are counted but not browsable

---

_When all tests pass, the app is ready for Store preparation.
See [business_model.md](business_model.md) for the Store launch plan._
