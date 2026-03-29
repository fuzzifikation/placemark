# Placemark — Beta Testing Checklist

> **Version:** 0.7.0  
> **Date:** 2026-03-14  
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
- **Folder C:** A mix of standard formats: JPEG, PNG, HEIC, TIFF, WebP
- **Folder D:** A folder with 500+ photos (performance test)
- **Folder E:** An empty folder
- **Folder F:** A folder with files > 150 MB
- **Folder G:** RAW files from at least 2–3 different camera brands (e.g., Canon CR2, Nikon NEF, Sony ARW, Adobe DNG). Sample files available at [raw.pixls.us](https://raw.pixls.us/).

| #    | Test                                        | Expected                                                                                     | ✅  | Notes |
| ---- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | --- | ----- |
| 2.1  | Scan Folder A (with subdirs ON)             | Folder picker opens, scan runs, progress bar shows file count + ETA + current filename       |     |       |
| 2.2  | Verify scan results                         | Results panel shows: folder path, total files, photos with location, photos without location |     |       |
| 2.3  | Check map after scan                        | Markers appear at correct locations, map auto-fits to bounds                                 |     |       |
| 2.4  | Scan same folder again                      | No duplicates — count stays the same (upsert logic)                                          |     |       |
| 2.5  | Scan Folder B (no GPS)                      | Reports "0 photos with location", map stays empty (or retains previous markers)              |     |       |
| 2.6  | Scan Folder C (mixed formats)               | All supported formats processed, count reflects actual photos                                |     |       |
| 2.7  | Scan Folder E (empty)                       | Reports 0 files found, no crash                                                              |     |       |
| 2.8  | Scan Folder F (large files)                 | Files > 150 MB are skipped with warning in error list                                        |     |       |
| 2.9  | Scan with subdirs OFF                       | Only top-level photos scanned, no recursion into subfolders                                  |     |       |
| 2.10 | Cancel scan mid-way                         | Scan stops, already-processed photos are kept in database                                    |     |       |
| 2.11 | Scan Folder D (500+ photos)                 | Progress bar updates smoothly, ETA is reasonable, completes without freezing                 |     |       |
| 2.12 | Scan a folder you don't have read access to | Graceful error message, no crash                                                             |     |       |

---

## 3. RAW Format Support

Requires: **Folder G** from the setup above. Download samples from [raw.pixls.us](https://raw.pixls.us/) if needed.

| #    | Test                                                              | Expected                                                                                        | ✅  | Notes |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --- | ----- |
| 3.1  | Scan Folder G (mixed RAW brands)                                  | All RAW files indexed; GPS coordinates and timestamps extracted correctly                       |     |       |
| 3.2  | Hover over a RAW photo marker                                     | Thumbnail displays — extracted from the embedded JPEG preview inside the RAW file               |     |       |
| 3.3  | Click a RAW photo marker                                          | Detail modal shows correct GPS, date, file size, and format (e.g., CR2, NEF, ARW)               |     |       |
| 3.4  | Scan a Canon CR2 file                                             | GPS and timestamp extracted, thumbnail generated                                                |     |       |
| 3.5  | Scan a Nikon NEF file                                             | GPS and timestamp extracted, thumbnail generated                                                |     |       |
| 3.6  | Scan a Sony ARW file                                              | GPS and timestamp extracted, thumbnail generated                                                |     |       |
| 3.7  | Scan a DNG file (Adobe/universal)                                 | GPS and timestamp extracted, thumbnail generated                                                |     |       |
| 3.8  | Scan a RAW file that has no embedded JPEG thumbnail               | Photo indexed (GPS/timestamp stored), thumbnail slot shows "Thumbnail not available" gracefully |     |       |
| 3.9  | Scan a large RAW file (50–140 MB, below 150 MB limit)             | Processed correctly — not skipped due to size                                                   |     |       |
| 3.10 | Scan a folder with matching JPEG + RAW pairs (same filename stem) | No duplicate markers — companion RAW files handled correctly                                    |     |       |
| 3.11 | Rescan a folder containing RAW files                              | No duplicates created — upsert logic works for RAW paths                                        |     |       |

---

## 4. Map Interaction

Requires: At least 50 geolocated photos loaded.

| #    | Test                           | Expected                                                                                                | ✅  | Notes |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | --- | ----- |
| 4.1  | Pan and zoom the map           | Smooth, no lag, markers reposition correctly                                                            |     |       |
| 4.2  | Zoom out to see clusters       | Markers cluster into numbered circles, color-coded by density (blue/yellow/red)                         |     |       |
| 4.3  | Zoom into a cluster            | Cluster splits into individual markers at high enough zoom                                              |     |       |
| 4.4  | Hover over a marker            | Thumbnail tooltip appears within ~200ms                                                                 |     |       |
| 4.5  | Hover over a different marker  | Previous tooltip disappears, new one shows                                                              |     |       |
| 4.6  | Click a marker                 | Photo preview modal opens with correct metadata                                                         |     |       |
| 4.7  | Verify modal metadata          | Correct filename, path, GPS coordinates (6 decimal places), date (in OS locale format), file size in MB |     |       |
| 4.8  | Click "Open in Viewer"         | Photo opens in system default image viewer                                                              |     |       |
| 4.9  | Click "Show in Folder"         | File explorer opens with the photo file selected                                                        |     |       |
| 4.10 | Close modal                    | Click overlay or X → modal closes                                                                       |     |       |
| 4.11 | Toggle heatmap mode (Settings) | Markers replaced by heatmap density overlay                                                             |     |       |
| 4.12 | Toggle heatmap off             | Markers return                                                                                          |     |       |

### Spider/Overlap Tests

Requires: Multiple photos at the same GPS coordinates (e.g., photos taken at the same spot).

| #    | Test                                              | Expected                                         | ✅  | Notes |
| ---- | ------------------------------------------------- | ------------------------------------------------ | --- | ----- |
| 4.13 | Zoom into overlapping markers                     | Spider expands: markers fan out into a circle    |     |       |
| 4.14 | Hover on a spidered marker                        | Thumbnail shows for the correct individual photo |     |       |
| 4.15 | Hover a second stacked group while spider is open | First spider collapses, second opens             |     |       |
| 4.16 | Zoom out past spider trigger zoom                 | Spider collapses back to cluster                 |     |       |

---

## 5. Theme & Appearance

| #   | Test                                           | Expected                                                               | ✅  | Notes |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------- | --- | ----- |
| 5.1 | Toggle light mode                              | All UI elements switch to light theme, map tiles switch to light style |     |       |
| 5.2 | Toggle dark mode                               | All UI elements switch to dark theme, map tiles switch to dark style   |     |       |
| 5.3 | Adjust glass blur (Settings → Appearance)      | Floating header and panels become more/less blurred in real-time       |     |       |
| 5.4 | Adjust surface opacity (Settings → Appearance) | Panels become more/less transparent in real-time                       |     |       |
| 5.5 | Reset Appearance to defaults                   | Glass blur returns to 12px, surface opacity to 70%                     |     |       |

---

## 6. Timeline

Requires: Photos spanning at least several months of date range.

| #    | Test                                      | Expected                                                           | ✅  | Notes |
| ---- | ----------------------------------------- | ------------------------------------------------------------------ | --- | ----- |
| 6.1  | Click timeline button in header           | Timeline bar appears at bottom with histogram                      |     |       |
| 6.2  | Verify histogram                          | Vertical bars correspond to photo density over time                |     |       |
| 6.3  | Drag left handle to narrow date range     | Map markers update in real-time, photo count updates               |     |       |
| 6.4  | Drag right handle                         | Same — filtered markers match the selected date range              |     |       |
| 6.5  | Drag the range itself (middle)            | Entire window slides, map updates                                  |     |       |
| 6.6  | Click Play button                         | Playback starts, date range advances automatically                 |     |       |
| 6.7  | Verify playback speed cycling             | Click speed button to cycle through intervals (week/month/6-month) |     |       |
| 6.8  | Toggle auto-zoom during playback          | Map should follow/not follow the current photo cluster             |     |       |
| 6.9  | Click Pause                               | Playback stops at current position                                 |     |       |
| 6.10 | Close timeline (X button)                 | Timeline disappears, date filter removed, all photos visible again |     |       |
| 6.11 | Reopen timeline                           | Same state or reset — no crash                                     |     |       |
| 6.12 | Timeline with photos all on the same date | Should handle gracefully — no division by zero, no infinite loop   |     |       |

---

## 7. Lasso Selection

Requires: Multiple markers visible on the map.

| #   | Test                                  | Expected                                                        | ✅  | Notes |
| --- | ------------------------------------- | --------------------------------------------------------------- | --- | ----- |
| 7.1 | Click Select (lasso) button in header | Lasso mode activates, cursor changes                            |     |       |
| 7.2 | Draw a freeform shape around markers  | Enclosed markers are selected, count appears on Organize button |     |       |
| 7.3 | Shift+Drag to add to selection        | Additional markers added to existing selection                  |     |       |
| 7.4 | Alt+Drag to remove from selection     | Markers within shape are deselected                             |     |       |
| 7.5 | Press Escape                          | Selection clears                                                |     |       |
| 7.6 | Toggle lasso off                      | Selection clears, cursor returns to normal                      |     |       |
| 7.7 | Lasso with no markers enclosed        | Selection count stays 0, no crash                               |     |       |
| 7.8 | Lasso across entire visible map       | All visible markers selected                                    |     |       |

---

## 8. File Operations — Copy

**IMPORTANT:** Use test photos you can afford to lose. Work with copies, not originals.

Prepare:

- Select 5–10 photos via lasso
- Create a test destination folder (empty)

| #    | Test                            | Expected                                                                | ✅  | Notes |
| ---- | ------------------------------- | ----------------------------------------------------------------------- | --- | ----- |
| 8.1  | Click Organize button           | Operations panel opens, shows selected photo count + total size         |     |       |
| 8.2  | Verify Source Summary           | Photos grouped by source folder with counts                             |     |       |
| 8.3  | Select "Copy" operation type    | Copy radio selected                                                     |     |       |
| 8.4  | Click "Select Destination"      | Folder picker opens                                                     |     |       |
| 8.5  | Choose empty destination folder | Path appears in panel                                                   |     |       |
| 8.6  | Click "Preview Operation"       | Dry-run shows file list with source → destination, all status "pending" |     |       |
| 8.7  | Click "Execute"                 | Progress bar appears: file count, percentage, current filename          |     |       |
| 8.8  | Wait for completion             | Success toast, files exist in destination                               |     |       |
| 8.9  | Verify files in destination     | Correct filenames, correct file sizes (compare manually)                |     |       |
| 8.10 | Verify source files untouched   | Original files still in source folder                                   |     |       |

### Copy Edge Cases

| #    | Test                                                         | Expected                                            | ✅  | Notes |
| ---- | ------------------------------------------------------------ | --------------------------------------------------- | --- | ----- |
| 8.11 | Copy the same photos to the same destination again           | Dry-run shows "skipped" (same size already exists)  |     |       |
| 8.12 | Copy to a folder with a file of same name but different size | Dry-run shows "conflict", Execute button disabled   |     |       |
| 8.13 | Cancel mid-copy (use 50+ photos for time)                    | Files copied so far are rolled back (sent to trash) |     |       |
| 8.14 | Copy to a read-only folder                                   | Error message before execution                      |     |       |
| 8.15 | Copy across drives (e.g., C: → D:)                           | Works correctly (cross-device copy path used)       |     |       |

---

## 9. File Operations — Move

**IMPORTANT:** Use only test photos. Moves delete the source file.

| #   | Test                         | Expected                                                         | ✅  | Notes |
| --- | ---------------------------- | ---------------------------------------------------------------- | --- | ----- |
| 9.1 | Select "Move" operation type | Move radio selected                                              |     |       |
| 9.2 | Preview and Execute move     | Files appear in destination, removed from source                 |     |       |
| 9.3 | Verify database updated      | Photos with new paths still appear on map (re-check coordinates) |     |       |
| 9.4 | Move across drives           | Works — copy + verify size + delete source                       |     |       |
| 9.5 | Cancel mid-move              | Completed moves are rolled back (files restored to source)       |     |       |

---

## 10. Undo

| #    | Test                                            | Expected                                                             | ✅  | Notes |
| ---- | ----------------------------------------------- | -------------------------------------------------------------------- | --- | ----- |
| 10.1 | After a copy: click "Undo"                      | Copied files sent to OS trash (Recycle Bin)                          |     |       |
| 10.2 | Check Recycle Bin                               | Files are there, recoverable                                         |     |       |
| 10.3 | After a move: click "Undo"                      | Files restored to original source location                           |     |       |
| 10.4 | Verify database after undo move                 | Photo paths reverted to original paths in database                   |     |       |
| 10.5 | Restart the app after an operation              | Undo is no longer available (session-based)                          |     |       |
| 10.6 | Undo when destination file was manually deleted | Graceful handling — no crash, reports partial undo or silent success |     |       |

---

## 11. File Operations — Batch Safety

| #    | Test                                                          | Expected                                                                         | ✅  | Notes |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- | ----- |
| 11.1 | Select photos with identical filenames from different folders | Dry-run shows renamed files: `IMG_001.jpg`, `IMG_001 (1).jpg`, `IMG_001 (2).jpg` |     |       |
| 11.2 | Try to copy/move to a system folder (e.g., AppData)           | Rejected with error message                                                      |     |       |
| 11.3 | Try to copy/move to the same source folder                    | Rejected — same-path detection                                                   |     |       |
| 11.4 | Try to move a source into a subfolder of itself               | Rejected — dest-inside-source detection                                          |     |       |

---

## 12. Settings Persistence

| #    | Test                                         | Expected                        | ✅  | Notes |
| ---- | -------------------------------------------- | ------------------------------- | --- | ----- |
| 12.1 | Change cluster radius to a non-default value | Map updates immediately         |     |       |
| 12.2 | Restart the app                              | Setting is preserved            |     |       |
| 12.3 | Change multiple settings across sections     | All persist after restart       |     |       |
| 12.4 | Click "Reset All" in Settings footer         | All settings return to defaults |     |       |
| 12.5 | Click per-section Reset button               | Only that section resets        |     |       |

---

## 13. Map Settings

| #    | Test                       | Expected                                                | ✅  | Notes |
| ---- | -------------------------- | ------------------------------------------------------- | --- | ----- |
| 13.1 | Toggle clustering off      | Individual markers shown (may be slow with many photos) |     |       |
| 13.2 | Adjust cluster radius      | Clusters become tighter or looser                       |     |       |
| 13.3 | Adjust cluster max zoom    | Clusters break apart at different zoom levels           |     |       |
| 13.4 | Adjust map padding         | Auto-fit uses more/less edge padding                    |     |       |
| 13.5 | Adjust transition duration | Pan/zoom animations become faster/slower                |     |       |
| 13.6 | Adjust point opacity       | Markers become more/less transparent                    |     |       |

---

## 14. Storage Management

| #    | Test                                    | Expected                                                              | ✅  | Notes |
| ---- | --------------------------------------- | --------------------------------------------------------------------- | --- | ----- |
| 14.1 | Open Settings → Storage                 | Shows photos DB size (MB), thumbnails DB size (MB), total photo count |     |       |
| 14.2 | Clear thumbnail cache                   | Thumbnails cleared, size drops to ~0                                  |     |       |
| 14.3 | Hover a photo after clearing thumbnails | Thumbnail regenerates on demand                                       |     |       |
| 14.4 | Adjust max cache size                   | Setting saved, eviction triggered if current size exceeds new limit   |     |       |
| 14.5 | Click "Open App Data Folder"            | Explorer opens the correct data folder                                |     |       |
| 14.6 | Clear entire database                   | All photos removed, map cleared, count goes to 0                      |     |       |

---

## 15. Locale & Formatting

| #    | Test                                    | Expected                                                        | ✅  | Notes |
| ---- | --------------------------------------- | --------------------------------------------------------------- | --- | ----- |
| 15.1 | With OS set to English (US) locale      | Dates show as month/day/year, numbers use commas                |     |       |
| 15.2 | With OS set to German (or other) locale | Dates show as day.month.year, numbers use periods for thousands |     |       |
| 15.3 | Check timeline labels                   | Locale-formatted dates                                          |     |       |
| 15.4 | Check photo detail modal                | Date and file size formatted per locale                         |     |       |

---

## 16. Portable Mode

| #    | Test                                        | Expected                                                     | ✅  | Notes |
| ---- | ------------------------------------------- | ------------------------------------------------------------ | --- | ----- |
| 16.1 | Build the portable `.exe`                   | `pnpm -C packages/desktop build` succeeds                    |     |       |
| 16.2 | Run the portable `.exe`                     | App launches, creates `placemark_data` folder next to `.exe` |     |       |
| 16.3 | Scan photos in portable mode                | Database created inside `placemark_data`, not in AppData     |     |       |
| 16.4 | Close and reopen                            | Data persists from `placemark_data` folder                   |     |       |
| 16.5 | Copy `.exe` + `placemark_data` to USB drive | App runs from USB with all data intact                       |     |       |

---

## 17. Error Handling & Edge Cases

| #    | Test                                                   | Expected                                                                          | ✅  | Notes |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------------------------- | --- | ----- |
| 17.1 | Disconnect internet, load map                          | Map tiles fail gracefully — cached tiles show, uncached areas are blank, no crash |     |       |
| 17.2 | Scan a folder with only non-image files                | Reports 0 photos, no errors (non-image files silently ignored)                    |     |       |
| 17.3 | Scan a folder with corrupted JPEG files                | Errors listed in collapsible error panel, scan continues for other files          |     |       |
| 17.4 | Open photo that has been deleted from disk since scan  | Graceful error in "Open in Viewer" — file not found message                       |     |       |
| 17.5 | Open photo from a network path that's now disconnected | Graceful error, no hang                                                           |     |       |
| 17.6 | Resize app window very small (300×200)                 | UI remains usable or at least doesn't crash                                       |     |       |
| 17.7 | Resize app window very large (4K fullscreen)           | Map fills space, no layout breakage                                               |     |       |

---

## 18. Performance Benchmarks

Record actual numbers for your test machine:

| #     | Metric                                               | Target                               | Actual | ✅  |
| ----- | ---------------------------------------------------- | ------------------------------------ | ------ | --- |
| 18.1  | Cold start time (first launch)                       | < 3 seconds                          |        |     |
| 18.2  | Scan 500 photos                                      | < 30 seconds                         |        |     |
| 18.3  | Scan 5,000 photos                                    | < 3 minutes                          |        |     |
| 18.4  | Map render with 5,000 markers (clustered)            | Smooth pan/zoom, no visible lag      |        |     |
| 18.5  | Thumbnail hover latency (cached)                     | < 100ms                              |        |     |
| 18.6  | Thumbnail hover latency (first generate, JPEG)       | < 500ms                              |        |     |
| 18.7  | Thumbnail hover latency (first generate, RAW)        | < 1,500ms                            |        |     |
| 18.8  | Timeline filter response                             | < 200ms after drag handle release    |        |     |
| 18.9  | Memory usage (5,000 photos loaded)                   | < 500 MB                             |        |     |
| 18.10 | Copy 100 files to new folder                         | < 30 seconds (depends on disk speed) |        |     |
| 18.11 | App data folder size (5,000 photos, full thumbnails) | < 200 MB                             |        |     |

---

## 19. Security & Privacy Verification

| #    | Test                                                                | Expected                                                                | ✅  | Notes |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- | --- | ----- |
| 19.1 | Monitor network traffic during scan (use Task Manager or Wireshark) | No outgoing requests except OSM tile fetches                            |     |       |
| 19.2 | Check that no photo data appears in tile requests                   | Tile URLs are generic: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |     |       |
| 19.3 | Try opening `javascript:alert(1)` via "Open External"               | Rejected — only http/https URLs allowed                                 |     |       |
| 19.4 | Check that renderer has no Node.js access                           | `window.require` is undefined, `window.process` is undefined            |     |       |

---

## 20. Export

Requires: At least 10 geolocated photos loaded.

| #    | Test                                                    | Expected                                                                                             | ✅  | Notes |
| ---- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --- | ----- |
| 20.1 | Click Export button in toolbar (Tools group)            | ExportSheet popover opens below the header with GeoJSON selected by default                          |     |       |
| 20.2 | Verify scope label — no selection active                | Header shows "N photos in view" matching the current map view count                                  |     |       |
| 20.3 | Verify scope label — with lasso selection active        | Header shows "N selected photos"                                                                     |     |       |
| 20.4 | Click Export with GeoJSON format                        | Native save dialog opens with default filename `placemark-export-YYYY-MM-DD.geojson`                 |     |       |
| 20.5 | Save the file and open in geojson.io                    | All GPS photos appear as markers at correct locations                                                |     |       |
| 20.6 | Export as CSV, open in Excel or LibreOffice             | Columns: filename, date_iso, latitude, longitude, camera_make, camera_model, folder_path             |     |       |
| 20.7 | Export as GPX, import into a GPS app or gpx.studio      | Waypoints appear at correct locations                                                                |     |       |
| 20.8 | Export with photos selected (lasso)                     | Exported file contains only the selected photos                                                      |     |       |
| 20.9 | Cancel the save dialog                                  | No file written, no error toast, popover stays open                                                  |     |       |
| 20.10 | Click outside the popover                              | Popover closes                                                                                       |     |       |
| 20.11 | Export with no GPS photos in view (all filtered out)   | Popover shows "No photos with GPS data in the current view" and Export button is disabled            |     |       |

---

## Testing Complete?

Before declaring beta-ready:

- [ ] All items in sections 1–19 pass
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
