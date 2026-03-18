# Suggestions

> Temporary file — delete once all items are addressed.
> Items are sorted by effort: quick wins first, larger work last.

---

## Open

### Quick wins (< 1 hour each)

- **Grey out Organize when nothing is selected.** Currently only disabled when the library is empty; should also be disabled when the selection count is zero.
- **Settings tab order: move Library & Import (Storage) to last.** It is rarely needed and should sit just before About, not as tab 2.
- **Heatmap additive, not exclusive.** Enabling the heatmap silently removes cluster circles even when clusters are toggled on. The heatmap should be an additional overlay that coexists with clusters.

---

### Small improvements (up to half a day each)

- **Consistent overlay dismissal + remove redundant "Done" buttons.** All panels should close on click-outside-into-map (not just some). Where X and click-outside both work, a separate "Done" button is redundant — audit and remove.
- **Floating header: replace bare dividers with visual pill containers.** The `|` separators are barely visible. Wrap [Clear | Add] in one pill and [Select | Organize] in another so the grouping is immediately legible.
- **Map zoom/info buttons: match floating header glass style.** The zoom (+/−) and map-info controls should use the same glassmorphism background, border, blur and hover treatment as the floating header.
- **Mouse-wheel zoom speed: faster default or user-adjustable.** Scroll-to-zoom feels too slow. Either increase the default zoom step or add a "Zoom Speed" slider in Map settings.
- **Expose timeline playback speed increments in Settings.** The three speeds (▶ = 7 days, ▶▶ = 30 days, ▶▶▶ = 180 days per tick) are hard-coded in `TimelineControls.tsx`. Move them to the Timeline settings tab alongside the existing update-interval slider.
- **[Low] Setting: single-click pin opens system photo viewer.** An opt-in setting so clicking a photo pin directly opens the OS default photo viewer, bypassing the in-app preview.

---

### Medium work (half day – 1 day each)

- **Auto-zoom fit-to-content button on the map.** Add a button next to the zoom +/− controls that fits the map to the current selection (or all photos). The fit must account for the floating header and timeline bar so no photos end up hidden underneath them — only the truly visible map area counts.
- **File operations: merge the Organize panel and preview into one window.** The dry-run preview contains the same information already shown in the Organize dialog. Merge them: show planned operations (source → destination) inline and put Execute/Cancel there, removing the redundant second window.
- **Spider effect: second ring for highly dense locations.** When too many photos share the same spot, add a second outer ring with a larger radius instead of cramming everything onto one ring.
- **Timeline: photo-count histogram above the scrubber.** Show a bar chart of photo density over time directly above the range-selector handles so users can spot activity bursts before dragging.
- **Help modal (keyboard shortcuts + About).** Add a `?` icon button to the floating header opening a modal with all keyboard shortcuts (Shift+drag = add to selection, Alt+drag = remove, Ctrl+A = select all, Escape = exit lasso, etc.). The same modal should surface the About info currently buried in Settings, making the About tab removable. This also serves as the in-map cheatsheet shown during lasso mode.
- **Pre-Store: audit and clean up `console.log` statements.** Remove or guard behind `isDev` before the Phase 8 Store build.

---

### Larger work (1–3 days)

- **Lasso overhaul: navigable select mode.** Currently lasso freezes the map. Proposed model: normal drag = pan (map always navigable), Shift+drag = add to selection, Alt+drag = remove from selection, Ctrl+A = select all (scoped to active timeline filter), Escape = exit lasso. The floating header should show a compact shortcut legend while lasso is active. _(consolidates: lasso navigation, Shift/Alt drag model, Ctrl+A, and in-map cheatsheet)_
- **Operation history UI.** Archived batches persist in the database but there is no UI. Add a Settings panel listing past copy/move operations with an "Export to JSON" option. History is informational only — file existence cannot be guaranteed after the fact.
- **[Low] Collapsible top floating toolbar.** Let the user hide/collapse the header bar for a clean full-screen map view.

---

## Addressed

<!-- Move items here once resolved -->

- **Inconsistent hover effects on floating header buttons.** Some outlined buttons showed a blue border flash on hover (Add, Organize) while others didn't; scale factor and shadow also differed. Fixed by extracting shared `outlinedHoverOn/Off` handlers applied uniformly to all outlined buttons.
