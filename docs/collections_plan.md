# Placemark — Placemarks Feature: User Experience Design

How placemarks work from the user's perspective, before implementation begins.

---

## Core Concept

A **placemark** is a saved filter state. It remembers:

- A map viewport (center + zoom, or bounding box)
- A date range (optional)
- A name the user gives it

Applying a placemark snaps the map to that viewport and sets the timeline slider to that date range. That's it. Placemarks do not own photos — they are bookmarks into a filter. Photos can fall under many placemarks simultaneously; deleting a placemark never touches a file.

---

## What Placemarks Are NOT

- **Not a photo selection.** The lasso tool selects photos for file operations (copy/move). Placemarks are for _navigation_, not for file operations. These are fully independent concepts.
- **Not a folder.** A placemark doesn't move or group files on disk.
- **Not a playlist.** Placemarks don't define a fixed list of photos. If you scan new photos that fall inside a saved placemark's bounds and dates, they automatically appear when you apply it.

---

## Types of Placemarks

### 1. Smart Placemarks (built-in, auto-updating, read-only)

Always present, always up to date. The user cannot rename or delete them.

| Name              | What it shows                               |
| ----------------- | ------------------------------------------- |
| **This Year**     | Current calendar year, no geographic filter |
| **Last 3 Months** | Rolling 90-day window, no geographic filter |

These are computed from the database on the fly, not stored as rows.

**Not included as smart placemarks:**

- **"All Photos"** — this is just "no filter active". It is represented by a **Clear** button, not a placemark.
- **"No GPS"** — this is a data quality filter (`WHERE latitude IS NULL`), not a geo+time fence. It has no bounding box and doesn't fit the placemark model. The no-GPS count is shown as a badge in the scan summary. A dedicated view for browsing unlocated photos is deferred to Phase 10 (GPS Editing).

### 2. Suggested Placemarks (auto-detection — deferred)

Auto-detecting vacation clusters from GPS+time data is a well-formed clustering problem that deserves a proper ML or spatial clustering solution (e.g. DBSCAN over lat/lng/time). This is deferred to a later phase. The `type` column in the schema (`'user' | 'suggested'`) already accommodates suggested placemarks for when this is implemented.

### 3. User Placemarks (manually created)

The user saves the current filter state at any time. This is the primary creation flow.

---

## Creation Flow

### Primary: "Save current view as placemark"

1. User pans/zooms map to an area of interest (e.g., zoomed into Tokyo)
2. User optionally drags the timeline to a date range (e.g., March 2019)
3. User clicks **"+ Save current view"** in the Placemarks panel (or the header button when a filter is active — see UI section below)
4. A small popover appears asking for a name — pre-filled with a suggestion based on visible content (e.g., "Tokyo · Mar 2019")
5. User confirms → placemark appears in the panel

The map bounds + current date range are captured at the moment of saving. Future map edits don't affect the saved placemark.

### Secondary: "Save from cluster right-click"

User right-clicks a dense cluster on the map:

> _"Save this area as a placemark…"_

Opens the same name popover, pre-fills the bounds to a tight box around that cluster. No date filter applied (user can add one after).

### No lasso-to-placemark flow

The lasso draws a freeform shape for _selecting_ photos to copy or move. It's a file operation tool. Converting a lasso shape to a placemark would be confusing (lassos are irregular; placemarks use rectangular bounds). Keep these tools separate.

---

## UI Design

### Layout

The app is map-first with floating elements — there is no persistent sidebar. The Placemarks panel is a **left-side floating panel**, matching the style of the existing right-side Settings and Stats panels.

### Toggle button

A bookmark icon button (🔖) is added to `FloatingHeader`, grouped with the existing Timeline and Lasso toggle buttons:

```
[⏱ Timeline]  [◎ Lasso]  [🔖 Placemarks]
```

Clicking it slides the placemarks panel in from the left.

### Save button

A **`+ Save current view`** header button appears when the map has been panned/zoomed away from the default view, or a date filter is active — i.e. there is something worth saving. It is hidden when the map is at default with no filters. Clicking it opens a small name popover:

```
┌─────────────────────────────────┐
│ Save as placemark               │
│ ┌─────────────────────────────┐ │
│ │ Tokyo · Mar 2019            │ │  ← pre-filled suggestion
│ └─────────────────────────────┘ │
│              [Cancel]  [Save]   │
└─────────────────────────────────┘
```

The name is pre-filled using the map center's reverse-geocoded city name (Nominatim) combined with the active date range. If no network or no result: falls back to `"My Placemark"`.

### Placemarks panel

```
┌─────────────────────────┐
│ PLACEMARKS              │
│                         │
│ SMART                   │
│  ○ This Year   (1,204)  │
│  ○ Last 3 Months  (347) │
│                         │
│ MY PLACEMARKS           │
│  ● Tokyo · Mar 2019 312 │  ← active, highlighted
│  ○ Lisbon 2021      188 │
│  ○ Scottish Hlds     94 │
│                         │
│  + Save current view    │
└─────────────────────────┘
```

- Photo counts update live as new scans add photos
- Active placemark is highlighted
- Clicking a placemark applies its filter instantly
- Right-clicking (or hovering to reveal a `⋯` button) a user placemark offers: Rename, Update to current view, Delete

---

## Applying a Placemark

Clicking a placemark:

1. Animates the map to fly to the saved viewport
2. Sets the timeline slider to the saved date range (or clears it if none was saved)
3. Updates the selection summary bar: _"312 photos · Tokyo area · Mar 2019"_
4. The lasso and file operation tools work normally within the filtered view

Clicking the **Clear** button (or any smart placemark) clears all filters and flies the map to fit all data.

---

## Editing a Placemark

**Rename:** Click the placemark name, type a new name, press Enter.

**Update to current view:** After adjusting the map and/or timeline, right-click the placemark → "Update to current view." Replaces the saved bounds and date range. A confirmation prompt prevents accidental overwrites.

**Delete:** Right-click → Delete. Confirmation dialog: _"Delete 'Tokyo · Mar 2019'? This does not affect your photos."_ No undo needed — placemarks are cheap to recreate.

---

## Interaction with File Operations

Placemarks and file operations are independent but complementary:

1. User applies **"Lisbon Summer 2021"** placemark → 188 photos appear on map
2. User uses **lasso tool** to draw around photos in the Alfama district → selects 47 photos
3. User clicks **Copy** → selects destination folder "Lisbon/Alfama"
4. File operation runs, 47 photos copied
5. Placemark is unchanged — it still points to the same area and dates

Placemarks are for _finding_ photos. The lasso is for _acting_ on them.

---

## Database Schema

```sql
CREATE TABLE placemarks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'suggested'
  bounds_north REAL,   -- nullable: no geographic filter if all NULL
  bounds_south REAL,
  bounds_east  REAL,
  bounds_west  REAL,
  date_start   TEXT,  -- nullable: ISO 8601 date, no date filter if NULL
  date_end     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Smart placemarks are not rows — they are hardcoded queries in the application.

---

## Implementation Plan

Follows the established project pattern: core logic in `packages/core`, IPC handlers in `packages/desktop/src/main/ipc/`, preload bridge in `preload/index.ts`, React UI in the renderer.

### Step 1: Database schema

Add to `packages/desktop/src/main/database/schema.ts` alongside the existing `photos`, `operation_batch`, and `operation_batch_files` tables:

```sql
CREATE TABLE IF NOT EXISTS placemarks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'suggested'
  bounds_north REAL,
  bounds_south REAL,
  bounds_east  REAL,
  bounds_west  REAL,
  date_start   TEXT,  -- ISO 8601, nullable
  date_end     TEXT,  -- ISO 8601, nullable
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

This is a schema-breaking change — instruct users to delete and rebuild `placemark.db`.

### Step 2: Core types (`packages/core`)

Add to `packages/core/src/models/`:

```typescript
// Placemark.ts
export interface Placemark {
  id: number;
  name: string;
  type: 'user' | 'suggested';
  bounds: { north: number; south: number; east: number; west: number } | null;
  dateStart: string | null; // ISO 8601
  dateEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlacemarkInput {
  name: string;
  bounds: Placemark['bounds'];
  dateStart: string | null;
  dateEnd: string | null;
}

export interface UpdatePlacemarkInput {
  id: number;
  name?: string;
  bounds?: Placemark['bounds'];
  dateStart?: string | null;
  dateEnd?: string | null;
}
```

Export from `packages/core/src/index.ts`.

### Step 3: Storage service (`packages/desktop/src/main/services/`)

Add `placemarks.ts` with prepared-statement CRUD:

```typescript
getAllPlacemarks(): Placemark[]
createPlacemark(input: CreatePlacemarkInput): Placemark
updatePlacemark(input: UpdatePlacemarkInput): Placemark
deletePlacemark(id: number): void
getPlacemarkPhotoCount(placemark: Placemark): number  // live count query
```

`getPlacemarkPhotoCount` runs a `SELECT COUNT(*)` against the `photos` table scoped to the placemark's bounds and date range — the same filter logic already used by the map views.

Smart placemarks (This Year, Last 3 Months) are hardcoded query functions here, not DB rows.

### Step 4: IPC handlers (`packages/desktop/src/main/ipc/`)

New file `placemarks.ts`, exported as `registerPlacemarksHandlers()`, called from `main/index.ts`:

| Channel             | Direction | Description                                          |
| ------------------- | --------- | ---------------------------------------------------- |
| `placemarks:getAll` | invoke    | Returns all user placemarks + smart placemark counts |
| `placemarks:create` | invoke    | Creates a new placemark, returns it                  |
| `placemarks:update` | invoke    | Renames or updates bounds/dates                      |
| `placemarks:delete` | invoke    | Deletes by id                                        |

### Step 5: Preload bridge (`packages/desktop/src/preload/index.ts`)

Add `placemarks` namespace to the `window.api` object:

```typescript
placemarks: {
  getAll: () => ipcRenderer.invoke('placemarks:getAll'),
  create: (input: CreatePlacemarkInput) => ipcRenderer.invoke('placemarks:create', input),
  update: (input: UpdatePlacemarkInput) => ipcRenderer.invoke('placemarks:update', input),
  delete: (id: number) => ipcRenderer.invoke('placemarks:delete', id),
}
```

Add types to `packages/desktop/src/preload/index.d.ts`.

### Step 6: Renderer — `usePlacemarks` hook

New file `packages/desktop/src/renderer/src/hooks/usePlacemarks.ts`:

- Loads all placemarks on mount via `window.api.placemarks.getAll()`
- Exposes `create`, `update`, `delete` — each calls IPC then refreshes local state
- Exposes `activePlacemark: Placemark | SmartPlacemark | null` and `setActivePlacemark`
- Applying a placemark emits the bounds and date range upward (to App state) to update the map and timeline — same mechanism the timeline and lasso already use

### Step 7: Renderer — `PlacemarksPanel` component

New file `packages/desktop/src/renderer/src/components/PlacemarksPanel.tsx`:

- Left-side floating panel, same glass style as `Settings` and `LibraryStatsPanel`
- Sections: SMART (hardcoded), MY PLACEMARKS (from DB)
- Each row: name, live photo count, active indicator
- `⋯` hover button → Rename (inline edit) / Update to current view / Delete
- `+ Save current view` button at bottom → opens `SavePlacemarkPopover`

New file `packages/desktop/src/renderer/src/components/Placemarks/SavePlacemarkPopover.tsx`:

- Small popover with a text input pre-filled with a name suggestion
- Name suggestion: derive from active date range only (e.g. "Mar 2019") — reverse geocoding (Nominatim) is a nice-to-have, add only if it doesn't add a dependency or significant complexity
- [Save] calls `usePlacemarks.create()` with current map bounds + timeline dates

### Step 8: Renderer — wire into `FloatingHeader` and `App`

- Add 🔖 toggle button to `FloatingHeader` to show/hide `PlacemarksPanel`
- Pass current map bounds and timeline date range down to `PlacemarksPanel` so it can capture them on save
- When a placemark is activated, update App-level filter state (same `filterBounds` / `dateRange` state already used by map and timeline)

### Step 9: Export integration

Export (Phase 6.2) respects the active placemark's bounds and date range — this falls out naturally since export already reads the current filter state.

---

## Open Questions (decide before implementation)

1. **Map viewport vs bounding box?** Saving zoom level + center is simpler and gives a more consistent "feels like I'm back where I was." Saving a bounding box is more semantically correct (works regardless of window size). Recommendation: save bounding box, compute zoom from bounds on apply.

2. **What if no date range is set when saving?** Save the placemark with no date filter — it will show all photos in that area regardless of date. This is fine and useful (e.g., "All my Paris photos ever").

3. **Suggested placemark threshold:** 3-day gap and 500km box are reasonable starting defaults. Make them configurable later (Settings > Advanced) if users find trips being split or merged incorrectly.

4. **Maximum number of user placemarks?** No limit. SQLite handles thousands of rows trivially.
