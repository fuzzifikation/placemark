# Placemark Backlog

## Ideas & Improvements

### 1. Multi-threaded Photo Import (EXIF/Thumbnail)

- Investigate using 2–3 worker threads for EXIF extraction and thumbnail generation during folder scan.
- All database writes (insert/update) should be funneled through a single thread or queued to avoid SQLite lock contention.
- Goal: Speed up large imports while keeping database safe and consistent.

### 2. Heatmap Feature Only Works in Dark Mode

- The map heatmap feature currently only works in dark mode.
- Needs update: should work in both light and dark modes (adjust color ramp or layer style as needed).
- Also update the heatmap to use a more continuous/gradient color ramp for better visual effect and data clarity.

### 3. Remove Databases at Uninstall

- Add an option to the Windows uninstaller (NSIS script) to delete user data (placemark.db, thumbnails.db) from AppData\Roaming\Placemark.
- Should be opt-in (checkbox: "Remove all user data") to avoid accidental data loss.

### 4. Thumbnail Cache Not Used for Hover Previews

- Hovering over a map dot takes just as long to display the thumbnail, even after the first time.
- Possible bug: thumbnail cache/database may not be used or is too slow for hover previews.
- Investigate if thumbnails are re-generated or re-fetched from disk every time instead of being cached in memory.

### 5. Settings Window Too Large (Needs Scroll)

- The settings window is too large for some screens and cannot be fully viewed.
- Add a scroll function or make the window responsive to ensure all settings are accessible.

### 6. Timeline Play Bug with Single Photo

- If the timeline slider is set so far back that only a single photo is visible, pressing play moves the app to the "Scan Folder" initial view (does not delete the database).
- After this, there is no way to return to the map unless the app is closed and reopened; then the map works again.
- Needs investigation: likely a state management or error handling bug when the timeline has only one photo.

### 7. Database Management in Settings

- The databases (placemark.db, thumbnails.db) should be shown as a section in the Settings window.
- Display current size of each database and provide an option to clear them.
- Remove the clear database option from the main page to avoid confusion and keep all management in Settings.

### 8. Remove Menu Bar from Main Window

- The main page currently shows a menu bar in the window.
- Remove the menu bar for a cleaner, more app-like appearance.

### 9. Implausible Date in Modal View

- In the modal view, the date (year) for some photos is completely implausible or incorrect.
- Needs investigation: check EXIF extraction, timestamp parsing, and display formatting.

### 10. Stop Clustering at Earlier Zoom

- Clustering of map markers should stop at an even earlier zoom level to allow more individual photo markers to be visible sooner.
- Adjust clustering settings for better detail at mid/high zoom.

### 11. Smart Separation of Overlapping Points

- At high zoom, photos with nearly identical GPS coordinates are not clickable because they remain clustered or overlap.
- Implement a smart solution (e.g., spiderfying, offsetting, or a photo stack) to separate points so each is individually clickable at high zoom.

### 12. Some Photos Show 'No Preview Available'

- In some cases, the modal or hover preview shows 'no preview available' for certain photos.
- Needs investigation: possible causes include missing/corrupt files, unsupported formats, EXIF/thumbnail extraction errors, or IPC issues.
- Check logs and error handling in thumbnail service and renderer.

### 13. Some Previews Are Upside Down

- Some photo previews are displayed upside down in the modal or hover, but open correctly in the system photo viewer.
- Needs investigation: likely an issue with EXIF orientation not being respected during thumbnail generation or display.
- Check orientation handling in sharp/exifr pipeline and renderer.

---

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

Add new ideas, bugs, or feature requests below:
