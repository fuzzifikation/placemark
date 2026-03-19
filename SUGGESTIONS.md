# Suggestions

> Temporary file — delete once all items are addressed.
> Items are sorted by effort: quick wins first, larger work last.

---

## Open

---

### Small improvements (up to half a day each)

---

### Medium work (half day – 1 day each)

- **[Future, skip for now] Drag and Drop.** Electron supports `webContents.startDrag({ files, icon })` for native OS drag. A drag handle chip in the floating header (visible when photos are selected) could let users drag a selection straight into Explorer. **Constraints:** copy-only (OS performs the copy — no dry-run, no undo, DB stays consistent); move via drag is unsafe (DB paths go stale). Not suitable for large batches (no progress/cancel). Complement to Organize, not a replacement. Implementation: drag handle in `FloatingHeader.tsx` → IPC → `event.sender.startDrag()`.

- **Pre-Store: audit and clean up `console.log` statements.** Remove or guard behind `isDev` before the Phase 8 Store build.

---

### Larger work (1–3 days)

- **[Phase 10 / GPS Editing] Show photos without GPS so users can assign location.** Currently photos without GPS are counted but not accessible from the map (they have no coordinates to plot). When GPS editing lands (Phase 10), users will need a way to surface these photos so they can drag them onto the map or assign coordinates manually. This is a prerequisite for geo-data editing to be useful. Implementation TBD — options: a dedicated "No GPS" panel/list, a sidebar badge that opens a photo grid, or a ghost-marker mode. Defer until Phase 10 design begins.

- **Dense cluster drill-down.** When a cluster exceeds ~30 photos at the same location (e.g. home), the spider doesn't scale. Two candidate approaches — both can coexist:
  - **Filmstrip panel (Option B).** Clicking a dense cluster opens a floating horizontal thumbnail strip at the bottom of the map — 5–8 thumbnails visible, scrollable, with a local mini-scrubber above showing the temporal distribution of just those photos. No map explosion; the map stays calm. Feels like "drill into this place."

  - **Investigate button.** A button appears (on the cluster popup or filmstrip) labeled "Investigate" or "Open in viewer". Clicking it opens the cluster's photos sorted by time in a dedicated list or viewer. Implementation TBD — options include: opening a temporary folder with symlinks/shortcuts and launching the system viewer, an in-app photo grid panel, or piping the file list to an external app. Leave this open until a clean approach is clear.

- **Lasso overhaul: navigable select mode.** Currently lasso freezes the map. Proposed model: normal drag = pan (map always navigable), Shift+drag = add to selection, Alt+drag = remove from selection, Ctrl+A = select all (scoped to active timeline filter), Escape = exit lasso. The floating header should show a compact shortcut legend while lasso is active. _(consolidates: lasso navigation, Shift/Alt drag model, Ctrl+A, and in-map cheatsheet)_
- **Operation history UI.** Archived batches persist in the database but there is no UI. Add a Settings panel listing past copy/move operations with an "Export to JSON" option. History is informational only — file existence cannot be guaranteed after the fact.
- **[Low] Collapsible top floating toolbar.** Let the user hide/collapse the header bar for a clean full-screen map view.

---

## Addressed

<!-- Move items here once resolved -->

- **File operations: merge Organize panel and preview into one window.** Eliminated the two-step "configure → Preview → Modify Settings → Execute" flow. The Organize modal is now a single scrollable panel: SourceSummary (collapsible) + Copy/Move radio + destination picker at top; dry-run preview auto-generates below as soon as a destination is selected, and auto-regenerates when op type or destination changes. Execute button lives in a permanent footer, disabled until a valid preview with pending ops is ready. Progress bar and "Cancel (Rollback)" appear inline during execution. No IPC or core-logic changes — renderer-only refactor in `OperationsPanel.tsx`.

- **Auto-zoom fit-to-content button on the map.** Added a custom MapLibre `IControl` (`FitToContentControl` class in `MapView.tsx`) that renders a fit/expand button in the top-right control group, matching the existing glass style via the injected CSS. When clicked: fits to selected photos if any, otherwise fits to all displayed photos. Both the button and the reactive auto-zoom (timeline playback) use the same asymmetric `fitPadding`: `top: mapPadding + 88px` (clears floating header), `bottom: mapPadding + 160px` when timeline is visible / `mapPadding` otherwise, sides: `mapPadding`. Passed from `App.tsx` as `fitPadding` prop through `MapView → useMapLayerManagement`.

- **Mouse-wheel zoom speed.** Raised `scrollZoom.setWheelZoomRate` from `1/450` (MapLibre default) to `1/200` in `useMapInitialization.ts`. Value is annotated for easy manual tuning.
- **Map zoom/info buttons: match floating header glass style.** Injected a reactive `<style>` tag in `MapView.tsx` that overrides `.maplibregl-ctrl-group` and attribution panel CSS. Updates live with glass settings and theme. Attribution links intercepted and opened in the OS browser via `window.api.system.openExternal`.
- **Consistent overlay dismissal + redundant button audit.** Settings: added X button (absolute top-right of modal); per-section Reset buttons moved from section headers to bottom-of-panel footer. OperationsPanel: backdrop click-to-close added, guarded when `executing`. LibraryStatsPanel: transparent backdrop div added for click-outside-to-close.

- **Grey out Organize when nothing is selected.** Changed `disabled` condition from `photoCount === 0` to `selectionCount === 0` in `FloatingHeader.tsx`.
- **Settings tab order: move Library to last.** Reordered sections array in `Settings.tsx` to Appearance → Map → Library.
- **Heatmap additive, not exclusive.** Removed the `setLayoutProperty('visibility', 'none')` calls for cluster layers in `mapLayers.ts` so heatmap and clusters coexist.

- **Inconsistent hover effects on floating header buttons.** Some outlined buttons showed a blue border flash on hover (Add, Organize) while others didn't; scale factor and shadow also differed. Fixed by extracting shared `outlinedHoverOn/Off` handlers applied uniformly to all outlined buttons.
- **Floating header: replace bare dividers with visual pill containers.** Wrapped [Clear | Add] and [Select | Organize] button groups in invisible pill containers with "Library" and "Tools" labels positioned below for clear topic identification. Strengthened dividers (40px tall, textMuted color) and made header/buttons more dense for improved visual hierarchy.

- **Expose timeline playback speed increments in Settings.** Added `playSpeedSlowDays`, `playSpeedMediumDays`, `playSpeedFastDays` to `AppSettings` (defaults: 7/30/180 days), with sliders in Map Settings alongside the existing Playback Animation Speed slider. Values flow to `useTimelinePlayback` replacing the hard-coded `PLAY_SPEEDS` increments.

- **[Low] Setting: single-click pin opens system photo viewer.** Added `singleClickOpensViewer` toggle (default: off) in General settings. When on, clicking a map pin calls `openInViewer` directly instead of opening the in-app preview modal.

- **Help modal (keyboard shortcuts).** Added `HelpModal.tsx` opened by a `?` (`HelpCircle`) icon button in FloatingHeader Group 5 (alongside Stats and Settings). Two sections: Selection Mode (enter/exit lasso, drag, Shift+drag add, Alt+drag remove, Esc cancel) and Map Navigation (scroll zoom, drag pan, right-drag rotate/tilt, click pin, fit button). Icon rows show the actual `Lasso` icon and fit-button SVG inside `<kbd>` chips. ESC and backdrop click to close. No automatic opening.

- **Timeline: photo-count histogram above the scrubber.** Two overlaid SVG bar layers behind the range slider: GPS photos (blue) and non-GPS only (grey). 100 equi-temporal buckets, bars grow upward and touch edge-to-edge. `Showing: x of y photos` header with `All: minDate – maxDate` subtitle moved to controls row. Boundary dates removed from slider area entirely.

- **Spider effect: multi-ring for dense locations.** Replaced single-ring layout with concentric rings in `calculateSpiderOffsets()`. Each ring's capacity is `floor(2π × radius / 22px)` so markers never crowd. Rings use multipliers `[1, 1.7, 2.4, 3.1, 3.8]` of the base radius, with half-step angular offsets on alternate rings to avoid radial alignment. Overflow goes to the last ring. No new settings, layers, or interfaces — the existing `spiderRadius` setting controls the base ring.
