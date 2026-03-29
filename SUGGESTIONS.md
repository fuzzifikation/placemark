# Suggestions

> Temporary file — delete once all items are addressed.
> Items are sorted by effort: quick wins first, larger work last.

---

## Open

> **v1.0 store-track items are in [plan.md](docs/plan.md) § v1.0 Store Readiness Checklist** — not listed here to avoid duplication.

---

## UI / Layout

---

- **Global search box: search locations, GPS coordinates, and filenames.** Add a unified search input (global and/or map-scoped) that supports:
  - **Place name lookup** — search by human-readable location (city, POI, admin area) with autocomplete and reverse-geocode suggestions (respect `reverseGeocodeEnabled`).
  - **Direct GPS input** — accept decimal or DMS coordinate pairs and pan the map to the location, with an option to show matching nearby photos.
  - **Filename/path search** — substring, prefix, and simple glob matches for filenames and folder paths; show preview thumbnails and counts in results.

  Search results should highlight matching photos on the map and in the library, allow quick-focus (pan + zoom), and respect privacy settings (no reverse-geocode text if disabled). Consider a small results dropdown with keyboard navigation and a dedicated full results panel for advanced filtering.

## Placemarks

- **"Fit timeline to view" + "Local view" timeline mode.** Two related but distinct features that both address the same precision problem: when photos at the current location span only weeks but the global timeline spans years, the scrub range is almost useless for fine selection.

  **Feature 1 — "Fit dates to view" button (quick snap)**
  A button (in the timeline bar or the Placemarks panel) that instantly snaps the two range thumbs to the min and max dates of photos currently visible in the map viewport. One click, no mode change. The global timeline scale stays the same — only the thumb positions update. Gives the user explicit control without surprising auto-behaviour. Works equally well inside an active placemark.

  **Feature 2 — Local / Global timeline mode toggle (time-axis zoom)**
  A toggle on the timeline (e.g. a small "globe / crosshair" icon, or a "Global | Local" pill) that switches between two timeline modes:
  - **Global mode (default):** the timeline endpoints are the earliest and latest dates across the entire library. Current behaviour.
  - **Local view mode:** the timeline endpoints are recomputed to the min/max dates of photos in the current map viewport. The entire time axis effectively "zooms in" on the visible location. The histogram bucket ranges and bar heights also recalculate for just those photos, so temporal density at that place is clearly visible. This makes fine-grained date selection practical — a location where you visited three times over two weeks becomes as easy to scrub as a global multi-year collection.

  **Behaviour details to nail down during implementation:**
  - **Live update vs. demand:** in Local mode the timeline should update when the map finishes panning/zooming (debounced on `map idle` event, not on every mouse-move). This avoids the disorienting feeling of the scale shifting while dragging.
  - **Thumb position preservation:** when switching modes, preserve the selected sub-range as a fraction of the current scale, not as absolute dates. This prevents the selection from snapping to the endpoints just because the domain changed.
  - **Empty viewport:** if the viewport contains no photos with GPS, fall back to global endpoints and show a subtle indicator ("No photos in view — showing global range").
  - **Placemark activation:** when a placemark is selected, it could auto-switch to Local mode (or offer a "Fit to placemark" shortcut). Keep this opt-in — don't hijack the mode automatically.

  **Implementation path:**
  - New IPC query: `photos:getDateRangeInBounds(bounds)` — trivial SQL `SELECT MIN(timestamp), MAX(timestamp) FROM photos WHERE lat/lon in bounds AND timestamp IS NOT NULL`.
  - `useTimelineData` (or equivalent): accept an optional `localBounds` param; when set, recalculate `timelineMin`, `timelineMax`, and the 100-bucket histogram array using only in-bounds photos.
  - `App.tsx`: add `timelineMode: 'global' | 'local'` to settings (or ephemeral state); wire map `idle` → `getDateRangeInBounds` → update timeline domain when in Local mode.
  - `TimelineBar.tsx`: render the mode toggle button; pass `localMin/Max` down to the scrubber and histogram SVG.

---

### Small improvements (up to half a day each)

---

### Medium work (half day – 1 day each)

- **Duplicate detection: strengthen the current heuristic before considering hashing.** The current `filename + filesize` rule is cheap, but it can incorrectly merge distinct photos once local and OneDrive libraries mix at scale. Investigate a safer duplicate-candidate approach that adds more lightweight metadata, such as **taken date/time**, and possibly camera info or source path context, before auto-skipping an import. Keep hashing as a last resort only — full-content hashes are more correct, but they significantly slow file reads and database ingest, which cuts against Placemark's large-library performance goals.

- **Rename and expand the Stats panel into a "Stats & Filters" panel.** The panel becomes the primary filtering surface for the map — always usable alongside the live map (no modal blocking). Every stat row is a filter. Vision:
  - **File formats** — click "HEIC (1 243)" to show only HEIC photos on the map. Multiple rows can be selected (OR logic). Active filters appear as dismissible chips in the floating header.
  - **Cameras** — click "Samsung SM-G991B (412)" to filter. Same chip pattern.
  - **No GPS** — a dedicated row/badge showing the count of photos that have no coordinates. Clicking it opens a side-list or separate view of those photos (this becomes the natural entry point for the Phase 10 GPS-editing workflow — users can see and act on their unlocated photos without a separate panel).
  - **More filter dimensions over time:** rating, year, folder/source, orientation (landscape / portrait / square), file size buckets.
  - **Filter summary header** — when any stats filter is active, a compact "Filtered: 412 of 3 204 photos" line appears at the top of the panel and a "Clear all filters" button appears in the floating header alongside the individual chips.
  - **Panel stays open while interacting with the map** — important: the stats panel must not capture pointer events outside its own bounds. The map should remain pannable and zoomable while the panel is open.
  - **Implementation path:** rename `LibraryStatsPanel` → `StatsFiltesPanel` (or keep filename, change title); add `activeFilters: StatsFilter[]` state to `usePhotoData`; extend `getPhotosWithLocation` SQL to accept format/camera/hasGps predicates; pass `onFilterToggle` callback into the panel; chips + "Clear" in `FloatingHeader`. No-GPS filter requires a separate IPC call + list view (Phase 10 dependency — stub the row as non-clickable until then).

- **[Future, skip for now] Drag and Drop.** Electron supports `webContents.startDrag({ files, icon })` for native OS drag. A drag handle chip in the floating header (visible when photos are selected) could let users drag a selection straight into Explorer. **Constraints:** copy-only (OS performs the copy — no dry-run, no undo, DB stays consistent); move via drag is unsafe (DB paths go stale). Not suitable for large batches (no progress/cancel). Complement to Organize, not a replacement. Implementation: drag handle in `FloatingHeader.tsx` → IPC → `event.sender.startDrag()`.

- **Pre-Store: audit and clean up `console.log` statements.** ✅ Already clean — all app code uses `console.error` only in catch blocks. Main process uses the structured `logger` service. No raw debug `console.log` calls in renderer or main.

---

### Larger work (1–3 days)

- **OneDrive photos: "Open in Viewer" and "Show in Folder" actions.**
  Both buttons in `PhotoPreviewModal` call `fs.access(photo.path, R_OK)` → `shell.openPath` / `shell.showItemInFolder`. These will silently fail for OneDrive photos because `photo.path` is a cloud identifier, not a local file path. The fix is source-aware branching in both the UI and the IPC handlers.

  **What to store during import (`onedriveImport.ts`):**
  The Graph API `DriveItem` already carries the fields we need. Store two extra columns during import:
  - `cloud_web_url TEXT` — the item's `webUrl` (direct HTTPS link to the file's OneDrive web viewer). Available on every `DriveItem`, costs nothing extra.
  - `cloud_folder_web_url TEXT` — `parentReference.path` gives the folder path but not a clickable URL; instead store the `webUrl` of the folder fetched once via `GET /me/drive/items/{folderId}?$select=webUrl`. Alternatively derive it from the item's own `webUrl` (trim the filename segment). The second approach avoids an extra API call.

  Add both columns to the `photos` schema (instruct user to delete and rebuild DB — alpha).

  **"Open in Viewer" on OneDrive:**
  Option A (recommended) — **on-demand download to temp, then `shell.openPath`.**
  - IPC handler checks `photo.source === 'onedrive'`
  - Calls `GET /me/drive/items/{cloudItemId}/content` (Graph API redirect to CDN URL)
  - Streams response to `os.tmpdir()/placemark-preview/{photoId}.{ext}`
  - Opens the local temp file with `shell.openPath()`
  - Clean up temp file on app exit (or after a configurable TTL, e.g. 30 min)
  - Show a short loading state in the modal while the download runs (spinner, "Downloading…")

  Option B — open `cloud_web_url` in the browser via `shell.openExternal()`. Zero implementation effort, but the system image viewer never opens — it lands in a browser tab showing OneDrive's built-in viewer. Not consistent with local photo experience.

  Option A is the right call: the user gets their configured image viewer, the experience is identical to local photos.

  **"Show in Folder" on OneDrive:**
  Rename the button label to **"Open in OneDrive"** when `photo.source === 'onedrive'` and call `shell.openExternal(photo.cloudFolderWebUrl)`. This opens the OneDrive folder in the browser, which is the correct analogy — you can't open a Finder/Explorer window pointing at a cloud path. Internet connection required (make this clear: grey out the button with tooltip "Requires internet" if offline detection is available).

  **UI changes (`PhotoPreviewModal.tsx`):**
  - Both buttons already receive the full `Photo` object — no prop change needed
  - Conditionally swap labels: `photo.source === 'onedrive' ? 'Open in OneDrive' : 'Show in Folder'`
  - "Open in Viewer": show spinner while download is in progress (small loading state beside the button)
  - No need to hide either button for OneDrive photos — both are meaningful actions

  **IPC changes (`photos.ts`):**
  - `photos:openInViewer` → branch on `photo.source`; local path: existing `shell.openPath`; OneDrive: download-then-open flow
  - `photos:showInFolder` → branch on `photo.source`; local path: existing `shell.showItemInFolder`; OneDrive: `shell.openExternal(photo.cloudFolderWebUrl)`

  **Scope note:** temp-file cleanup and a reuse cache (avoid re-downloading the same photo) are nice-to-haves but not blockers. Ship the basic download-to-temp flow first.

- **Concurrent import: parallel EXIF reads (local) and parallel subfolder walks (OneDrive).**
  Both import paths are currently sequential. The shared fix is a `runWithConcurrency(items, limit, asyncFn)` utility — a simple pool that keeps N async tasks in flight at a time, pulling the next item when a slot frees. One implementation, used in both places.

  **Local scan (`filesystem.ts`):**
  The full file list is known upfront after `findImageFiles`. The sequential `for...of` loop over `processImageFile` becomes a `runWithConcurrency` call. Since `exifr` reads only the EXIF segment (a few KB at the start of the file — not the full image), memory pressure is negligible and concurrency of 8 is safe even on HDDs.

  Abort handling: check `abortRequested` at the start of each slot's task function, same as the current loop.

  **OneDrive import (`onedriveImport.ts`):**
  Replace the sequential `for...of subfolderIds` recursion in `importFolder` with a `runWithConcurrency` call over discovered subfolder IDs. Each slot independently fetches the subfolder's `childCount`, pages through its items, and recurses into its own sub-subfolders. The shared `counts` and `totals` mutable objects are safe because `better-sqlite3` calls (`isDuplicateOneDrivePhoto`, `createPhoto`) are synchronous — they never interleave between JS event loop ticks.

  **Concurrency limit:** a single named constant `IMPORT_CONCURRENCY = 8` in a shared config or at the top of each service file. Same value for both — both workloads are small async metadata reads with no meaningful memory cost per slot.

  **`runWithConcurrency` shape:**

  ```ts
  async function runWithConcurrency<T>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<void>
  ): Promise<void>;
  ```

  No external library needed — implementable in ~15 lines using a semaphore pattern (a counter + a queue of pending resolvers, or simply chunking with `Promise.all` on batches of `limit`). The chunking approach is slightly simpler but less optimal (a slow item stalls its whole batch); a proper pool is cleaner and only marginally more code.

  **Location:** add the utility to `packages/desktop/src/main/services/filesystem.ts` (alongside the scan code) or a new `packages/desktop/src/main/utils/concurrency.ts` if reuse across more files seems likely.

  **Not needed yet:** 429 / `Retry-After` handling for OneDrive rate limiting. At concurrency 8, well under Microsoft's 10k requests/10min throttle for typical personal libraries. Add if users hit throttle errors in practice.

- **Metadata repair tool — detect and fix outlier dates and GPS.** Scan the database for photos with clearly improbable metadata and surface them for the user to review and repair.
  - **Date outliers:** flag timestamps outside a plausible range (e.g. before 1990 or after the current year + 1). Sort photos chronologically; any photo whose date is more than N years from its nearest neighbours is a candidate. Show a list: thumbnail, filename, bad date, suggested replacement (median of the N photos immediately before/after it in the same import batch or folder).
  - **GPS outliers:** detect coordinates that are geographically implausible relative to the surrounding photos (e.g. a single photo in a cluster of Paris shots that lands in the Pacific Ocean). Flag these as likely corrupt. Offer to clear the GPS or inherit from adjacent photos (same logic as date repair).
  - **Corrupt / unparseable metadata:** photos where EXIF extraction returned an error or produced null for both date and GPS. Surface as a separate "unreadable metadata" bucket — users may want to delete these, re-export from their original, or manually assign date/location.
  - **UI approach:** a "Library Health" card in the Stats panel (or a dedicated "Health" toolbar button) showing three counters: _Suspicious dates_, _Suspicious GPS_, _Missing metadata_. Each counter is clickable and opens a focused list panel where the user can accept suggested repairs, skip, or clear values individually. Batch-accept-all shortcut for long lists.
  - **Implementation notes:** outlier detection runs on-demand (not continuously). Date outlier query: `SELECT id, path, timestamp FROM photos WHERE timestamp < ? OR timestamp > ? ORDER BY timestamp`. GPS outlier: cluster all coords, compute median centroid per cluster, flag any point > X km from centroid. All writes go through the existing `photos:setLocation` / IPC update path (Phase 10 code reuse). No EXIF file writes required for date-only repair (DB-only correction is acceptable initially).

- **[Phase 10 / GPS Editing] Show photos without GPS so users can assign location.** Currently photos without GPS are counted but not accessible from the map (they have no coordinates to plot). When GPS editing lands (Phase 10), users will need a way to surface these photos so they can drag them onto the map or assign coordinates manually. This is a prerequisite for geo-data editing to be useful. Implementation TBD — options: a dedicated "No GPS" panel/list, a sidebar badge that opens a photo grid, or a ghost-marker mode. Defer until Phase 10 design begins.

- **Dense cluster drill-down.** When a cluster exceeds ~30 photos at the same location (e.g. home), the spider doesn't scale. Two candidate approaches — both can coexist:
  - **Filmstrip panel (Option B).** Clicking a dense cluster opens a floating horizontal thumbnail strip at the bottom of the map — 5–8 thumbnails visible, scrollable, with a local mini-scrubber above showing the temporal distribution of just those photos. No map explosion; the map stays calm. Feels like "drill into this place."

  - **Investigate button.** A button appears (on the cluster popup or filmstrip) labeled "Investigate" or "Open in viewer". Clicking it opens the cluster's photos sorted by time in a dedicated list or viewer. Implementation TBD — options include: opening a temporary folder with symlinks/shortcuts and launching the system viewer, an in-app photo grid panel, or piping the file list to an external app. Leave this open until a clean approach is clear.

- **Lasso overhaul: navigable select mode.** Currently lasso freezes the map. Proposed model: normal drag = pan (map always navigable), Shift+drag = add to selection, Alt+drag = remove from selection, Ctrl+A = select all (scoped to active timeline filter), Escape = exit lasso. The floating header should show a compact shortcut legend while lasso is active. _(consolidates: lasso navigation, Shift/Alt drag model, Ctrl+A, and in-map cheatsheet)_
- **Operation history UI.** Archived batches persist in the database but there is no UI. Add a Settings panel listing past copy/move operations with an "Export to JSON" option. History is informational only — file existence cannot be guaranteed after the fact.
- **[Low] Collapsible top floating toolbar.** Let the user hide/collapse the header bar for a clean full-screen map view.

- **[Advanced / Experimental] 3D spatio-temporal photo graph.** Visualise the photo collection as a 3D scatter plot where X and Y are geographic coordinates (longitude/latitude) and Z is time. Each dot is a photo. The result is a "time tower" — clusters rise vertically as you photograph the same place across years. Interactions: slow auto-rotation, click-to-select a photo, timeline scrubbing animates the Z-slice. Optional map texture projected onto the XY plane as a ground overlay (raster tiles reprojected to screen space). Gate behind an "Advanced visualisations" setting to avoid overwhelming casual users. Candidate renderer: Three.js or deck.gl (both work in Electron's renderer process without a GPU server).

---

## Addressed

<!-- Move items here once resolved -->

- **OneDrive import: "include subdirectories" toggle.** The subfolder toggle in `ScanOverlay` is now shared between local and OneDrive import modes. `useFolderScan.importOneDriveFolder` already threaded the param through to the IPC call; the only change was rendering the toggle in the OneDrive branch of `ScanOverlay`.

- **Abort during OneDrive import.** `useFolderScan.abortScan` now branches on an `activeSource` ref (`'local' | 'onedrive' | null`), dispatching `onedrive:abortImport` when a OneDrive import is in progress. `onedriveImport.ts` gained a module-level `abortRequested` flag checked at each item and subfolder boundary. IPC handler, preload bridge, and type definitions updated accordingly.

- **Duplicate counts + metadata issues in Stats panel.** `getLibraryStats` now returns `photosWithIssues` (count of distinct photos with entries in `photo_issues`) and `lastImportSummary` (in-memory singleton set after each local or OneDrive scan). `LibraryStatsPanel` shows a new **Library Health** card ("Metadata issues — N photos" in amber, or "None" in muted) and a **Last Import** card with source, processed/imported/duplicates-skipped counts and relative time. `LastImportSummary` interface added to `preload.d.ts`.

- **Accounts tab in Settings.** "Accounts" tab (`AccountsSettings.tsx`) wired to the existing `onedrive:getConnectionStatus`, `onedrive:login`, and `onedrive:logout` IPC calls. Connected state shows account email + two-stage Disconnect button (first click → "Confirm disconnect" in red + Cancel; second click → deletes local token, refreshes state, toasts). Disconnected state shows "Connect OneDrive" button that calls `login()` directly. Privacy note: tokens stored locally via OS secure encryption, never sent to Placemark servers.

- **Align all floating glass panels to a shared layout grid.** Introduced `LAYOUT` constants in `ui.ts` (`PANEL_INSET`, `PANEL_GAP`, `HEADER_HEIGHT`, `TIMELINE_HEIGHT`, `PLACEMARKS_WIDTH`). `App.tsx` is now the single layout authority — all panel `position/top/left/bottom/right` declarations live there; `FloatingHeader` and `PlacemarksPanel` are fully layout-agnostic. Map controls use `LAYOUT.PANEL_INSET_PX` margins so they align with the panels. `BORDER_RADIUS.XL` used consistently on all glass surfaces.

- **File operations: merge Organize panel and preview into one window.** Eliminated the two-step "configure → Preview → Modify Settings → Execute" flow. The Organize modal is now a single scrollable panel: SourceSummary (collapsible) + Copy/Move radio + destination picker at top; dry-run preview auto-generates below as soon as a destination is selected, and auto-regenerates when op type or destination changes. Execute button lives in a permanent footer, disabled until a valid preview with pending ops is ready. Progress bar and "Cancel (Rollback)" appear inline during execution. No IPC or core-logic changes — renderer-only refactor in `OperationsPanel.tsx`.

- **Auto-zoom fit-to-content button on the map.** Added a custom MapLibre `IControl` (`FitToContentControl` class in `MapView.tsx`) that renders a fit/expand button in the top-right control group, matching the existing glass style via the injected CSS. When clicked: fits to selected photos if any, otherwise fits to all displayed photos. Both the button and the reactive auto-zoom (timeline playback) use the same asymmetric `fitPadding`: `top: mapPadding + 88px` (clears floating header), `bottom: mapPadding + 160px` when timeline is visible / `mapPadding` otherwise, sides: `mapPadding`. Passed from `App.tsx` as `fitPadding` prop through `MapView → useMapLayerManagement`.

- **Timeline auto-zoom during manual scrub.** Fixed timeline auto-fit gating so auto-zoom now applies when the user manually drags the timeline selector bar (not only during playback), as long as timeline auto-zoom is enabled.

- **Show date range below the location label in placemark rows.** Placemarks now render location and date on separate lines (location first, date range beneath), preventing overflow and improving readability for longer place labels.

- **Align photo counts between Smart Placemarks and My Placemarks rows.** Placemark photo count badges are now consistently aligned to the same right-side column across Smart and My Placemarks rows.

- **Oldest / youngest photo: click to open in system viewer.** "Oldest photo" and "Newest photo" rows in the Date Range card are now clickable. They show with a dotted underline and open the photo in the OS default viewer via `window.api.system.openExternal`. File paths are fetched alongside timestamps in `getLibraryStats()`.

- **Mouse-wheel zoom speed.** Raised `scrollZoom.setWheelZoomRate` from `1/450` (MapLibre default) to `1/200` in `useMapInitialization.ts`. Value is annotated for easy manual tuning.
- **Map zoom/info buttons: match floating header glass style.** Injected a reactive `<style>` tag in `MapView.tsx` that overrides `.maplibregl-ctrl-group` and attribution panel CSS. Updates live with glass settings and theme. Attribution links intercepted and opened in the OS browser via `window.api.system.openExternal`.
- **Consistent overlay dismissal + redundant button audit.** Settings: added X button (absolute top-right of modal); per-section Reset buttons moved from section headers to bottom-of-panel footer. OperationsPanel: backdrop click-to-close added, guarded when `executing`. LibraryStatsPanel: transparent backdrop div added for click-outside-to-close.

- **Grey out Organize when nothing is selected.** Changed `disabled` condition from `photoCount === 0` to `selectionCount === 0` in `FloatingHeader.tsx`.
- **Settings tab order: move Library to last.** Reordered sections array in `Settings.tsx` to Appearance → Map → Library.

- **Dedicated "Placemarks" settings tab.** Moved all placemarks-related toggles (`reverseGeocodeEnabled`) and timeline settings (auto-zoom during play, play speed, timeline update interval) out of the Map and Library tabs and into a new "Placemarks" tab in the Settings modal. Created `PlacemarksSettings.tsx`, added `Bookmark` icon + `placemarks` section in `Settings.tsx`, removed the moved controls from `StorageSettings.tsx` and `MapDisplaySettings.tsx`.
- **Update/rename existing placemarks from the row itself.** Added a hover-visible **Update** action that overwrites the placemark's saved bounds/date range from the current map view + active timeline filter. Added inline rename via **double-click placemark name** with Enter/Escape handling and duplicate-name validation, so users can refine and rename without deleting/recreating placemarks.
- **Picture preview modal: show camera model and reverse-geocoded location (respecting privacy setting).** Added camera metadata display in the preview details and privacy-aware location text. When reverse geocoding is enabled, the modal resolves and shows a human-readable place label (with coordinate fallback and in-memory caching); when disabled, it shows coordinates only. Also fixed map-click data flow so `cameraMake`/`cameraModel` are passed through map feature properties and consistently visible in the modal.
- **Heatmap additive, not exclusive.** Removed the `setLayoutProperty('visibility', 'none')` calls for cluster layers in `mapLayers.ts` so heatmap and clusters coexist.

- **Inconsistent hover effects on floating header buttons.** Some outlined buttons showed a blue border flash on hover (Add, Organize) while others didn't; scale factor and shadow also differed. Fixed by extracting shared `outlinedHoverOn/Off` handlers applied uniformly to all outlined buttons.
- **Floating header: replace bare dividers with visual pill containers.** Wrapped [Clear | Add] and [Select | Organize] button groups in invisible pill containers with "Library" and "Tools" labels positioned below for clear topic identification. Strengthened dividers (40px tall, textMuted color) and made header/buttons more dense for improved visual hierarchy.

- **Expose timeline playback speed increments in Settings.** Added `playSpeedSlowDays`, `playSpeedMediumDays`, `playSpeedFastDays` to `AppSettings` (defaults: 7/30/180 days), with sliders in Map Settings alongside the existing Playback Animation Speed slider. Values flow to `useTimelinePlayback` replacing the hard-coded `PLAY_SPEEDS` increments.

- **[Low] Setting: single-click pin opens system photo viewer.** Added `singleClickOpensViewer` toggle (default: off) in General settings. When on, clicking a map pin calls `openInViewer` directly instead of opening the in-app preview modal.

- **Help modal (keyboard shortcuts).** Added `HelpModal.tsx` opened by a `?` (`HelpCircle`) icon button in FloatingHeader Group 5 (alongside Stats and Settings). Two sections: Selection Mode (enter/exit lasso, drag, Shift+drag add, Alt+drag remove, Esc cancel) and Map Navigation (scroll zoom, drag pan, right-drag rotate/tilt, click pin, fit button). Icon rows show the actual `Lasso` icon and fit-button SVG inside `<kbd>` chips. ESC and backdrop click to close. No automatic opening.

- **Timeline: photo-count histogram above the scrubber.** Two overlaid SVG bar layers behind the range slider: GPS photos (blue) and non-GPS only (grey). 100 equi-temporal buckets, bars grow upward and touch edge-to-edge. `Showing: x of y photos` header with `All: minDate – maxDate` subtitle moved to controls row. Boundary dates removed from slider area entirely.

- **Spider effect: multi-ring for dense locations.** Replaced single-ring layout with concentric rings in `calculateSpiderOffsets()`. Each ring's capacity is `floor(2π × radius / 22px)` so markers never crowd. Rings use multipliers `[1, 1.7, 2.4, 3.1, 3.8]` of the base radius, with half-step angular offsets on alternate rings to avoid radial alignment. Overflow goes to the last ring. No new settings, layers, or interfaces — the existing `spiderRadius` setting controls the base ring.

---

## Deferred

<!-- Features that are explicitly out of scope or require major rethinking -->

- **EXIF editing workflow.** Out of scope for Placemark. EXIF is best edited by dedicated tools; Placemark should not attempt external editor integration or try to handle EXIF writes. User can click "Show in folder" in the photo preview modal to open the file location and edit with their preferred tool. Safer, simpler, and stays true to Placemark's focus: organize and visualize, not edit metadata.
