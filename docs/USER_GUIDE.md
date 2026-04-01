# Placemark User Guide

Placemark helps you explore your photo collection by place and time while keeping your data local.

---

## 1. Add Photo Sources

When you open Placemark, start by adding a source.

### Local folders and network shares

1. Click **Add Source**.
2. Choose a folder on your PC, external drive, or network share.
3. Placemark scans supported image files and reads embedded EXIF metadata such as GPS coordinates, timestamps, and camera data.

### OneDrive

1. Click **Add Source** and choose **OneDrive**.
2. Sign in with your Microsoft account.
3. Pick the folder you want to scan.

Placemark imports metadata into its local database. Photos without GPS data are still counted, but they do not appear on the map until they have location data.

---

## 2. Explore the Map

- **Pan:** Click and drag the map.
- **Zoom:** Use the mouse wheel or the `+` and `-` controls.
- **Fit view:** Use the fit button to center the current result set.
- **Clusters:** Dense areas group into clusters. Click a cluster to zoom in.
- **Markers:** Hover a marker for a preview and click it to inspect the photo.

Placemark is designed so floating panels can stay open while you continue using the map.

---

## 3. Narrow by Time

Use the timeline at the bottom of the window to filter by date.

- Drag across the timeline to define a time window.
- Clear the range to return to the full result set.
- Use playback to move through your library chronologically.
- Use **Fit timeline to view** to match the timeline to what is visible on the map.

Geographic and temporal filters always work together.

---

## 4. Use Stats and Filters

Open **Stats** from the floating header to inspect your library.

The panel shows:

- Total photos
- GPS and date coverage
- File format breakdown
- Camera breakdown
- Date range
- Storage usage
- Library health and last import summary

Format rows and camera rows are interactive filters. Click them to narrow the map instantly.

Active filters appear as chips below the header, where you can remove them one by one or clear them all.

---

## 5. Save Placemarks

Placemarks save a useful map-and-time view so you can return to it quickly.

- Save a trip, city, season, or recurring place
- Reopen it later with one click
- Rename or delete saved placemarks
- Use built-in smart placemarks such as recent time windows

Placemarks are stored locally in your database.

---

## 6. Select and Organize Photos

### Selection

- Click a marker to select a single photo.
- Use the lasso tool to draw around multiple photos.
- Clear the selection when you want to return to viewport-based actions.

### File operations

Placemark can help you reorganize files safely.

1. Select photos.
2. Choose **Copy** or **Move**.
3. Review the preview before anything happens.
4. Run the operation and follow progress.
5. Use **Undo** if you need to reverse it.

Operations are designed to avoid silent overwrites and recover cleanly from failures.

---

## 7. Export Data

Use **Export** from the toolbar to save the current result set.

- **CSV:** Spreadsheet-friendly table
- **GeoJSON:** Standard geographic data format
- **GPX:** GPS waypoint format

If you have an active selection, Placemark exports the selection. Otherwise, it exports the photos currently visible under the active filters.

All exports are local file writes. Nothing is uploaded.

---

## 8. Settings and Privacy Controls

Open **Settings** from the floating header.

You can configure:

- Light and dark appearance
- Map style and display options
- Timeline behavior
- Thumbnail and database storage
- Connected accounts
- Optional external services

If you disable external services, Placemark can still work entirely with local data.

---

## 9. If Photos Do Not Appear on the Map

Common reasons:

- The photos do not contain GPS coordinates.
- The active map bounds or time range exclude them.
- A format or camera filter is active.
- The source folder has not been scanned yet.

Check the Stats and Filters panel, the active filter chips, and the current timeline range before rescanning.
