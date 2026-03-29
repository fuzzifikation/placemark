# Placemark

**Privacy-first, local-first photo organizer.**
Rediscover your photo collection by visualizing _where_ and _when_ your photos were taken — using the GPS coordinates your phone or camera recorded at capture time and stored inside the photo file. No cloud uploads, no AI inference, no guessing.

---

## Project Goals

Placemark is a privacy-first, local-first application that allows users to explore and organize their photos by where and when they were taken.

The core idea is to treat geographic location and time as explicit, user-controlled lenses on personal photo collections:

- **Location:** Read directly from GPS coordinates already embedded in the photo file by the device that took the photo — Placemark never estimates, infers, or guesses location.
- **Cloud Sources:** Optional integrations (OneDrive, etc.) are pass-through only — metadata flows directly from your cloud provider to your local database, never through Placemark servers.
- **Zero Infrastructure:** No photos, metadata, or derived data are ever uploaded to Placemark-maintained servers or any third-party platform under Placemark's control.

### Primary Goals

- Allow users to visualize photos on a map based on EXIF GPS metadata.
- Support multiple photo sources (Local folders, Network shares, OneDrive).
- Enable filtering by both geographic area and date window.
- Store all derived metadata locally on the user’s device.
- Avoid background processing, inference, or tracking by default.
- Be transparent, predictable, and reversible in all operations.

### Privacy Guarantees

Placemark implements a **zero-infrastructure, pass-through cloud model**:

#### Data Stays Local

- **No Placemark Servers:** Placemark does not operate any backend servers or cloud storage. There is no "Placemark account" or "Placemark cloud."
- **No Third-Party Data Syncing:** All photo metadata, organization (placemarks, collections, selections), filtering state, and thumbnails are stored exclusively on your device in a local SQLite database.
- **Explicit User Control:** The only way Placemark accesses external data is when **you explicitly** decide to add a cloud source like OneDrive.

#### Cloud Sources Are Pass-Through Only

- **Direct User-to-Provider Connection:** When you connect OneDrive, Placemark acts as a client to the Microsoft Graph API. Placemark reads file metadata (timestamps, EXIF) directly from your Microsoft account. **Placemark servers never see, store, or log this data.**
- **One-Time Import Pattern:** Placemark scans your cloud storage once (you control when and what folder), downloads metadata locally, and stores it in your local database. No background syncing, no ongoing connection.
- **Access Tokens Are Local-Only:** OAuth tokens never leave your device, but they are security-sensitive. Placemark must store them in **OS-backed secure credential storage** rather than plain-text settings or the local database.

#### Non-Personal External APIs (User-Controlled)

Placemark may optionally contact external services for non-personal, geospatial data:

- **Map Tiles (OpenStreetMap):** Downloaded to display the map. Tiles contain geographic/cartographic data with no connection to your photos or identity.
- **Reverse Geocoding (Nominatim):** Optional feature — when enabled, Placemark sends coordinates only (no photo metadata) to look up place names. Toggleable in Settings. Single-use, uncached requests.

#### Full Offline Mode

If you disable all external APIs, Placemark functions completely offline:

- Local photos, local maps (if cached), local filters, local organization.
- No internet connection required.

#### Summary

**Your privacy is preserved because:** You control all data flows. Placemark is a client tool, not a platform. Cloud sources belong to you (Microsoft, etc.), never Placemark.

---

## Supported Formats

Placemark reads EXIF metadata (GPS coordinates, timestamps) and generates thumbnails for the following image formats:

**Standard Formats:**

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- HEIC/HEIF (`.heic`, `.heif`) — Apple Photos format
- TIFF (`.tiff`, `.tif`)
- WebP (`.webp`)

**Professional RAW Formats (experimental):**

CR2, CR3, NEF, NRW, ARW, DNG, RAF, ORF, RW2, PEF, SRW, RWL

RAW files are scanned and map-placed when GPS data is readable. Support quality varies by format: TIFF-based formats (NEF, ARW, DNG, etc.) generally work well; Canon CR3 GPS and thumbnail extraction are known to be unreliable. RAW support is not fully tested across all brands.

---

## User Manual

### 1. Getting Started

**Launching the App**
When you open Placemark, you are greeted with a clean map interface. The data stays on your computer.

**Adding Your Photos**

1. Click the **"Add Source"** button (or the `+` icon) in the top-left sidebar.
2. Choose your source type:

- **Local Folder:** Select a folder on your computer (e.g., your "Pictures" folder).
- **OneDrive (Sketch Phase):** Connect your Microsoft account, browse folders (including Camera Roll), and choose a folder. Current sketch mode validates connect/browse/select behavior before full import is enabled.

3. For local folder scans, Placemark reads the **GPS coordinates already embedded in each photo's EXIF metadata** — the location your phone or camera recorded automatically at the moment the photo was taken.
   - **Note:** Only photos that already contain GPS coordinates in their EXIF metadata will appear on the map. Placemark does not estimate or infer location from image content. Photos without embedded GPS coordinates are counted but skipped for map display.

### 2. Navigating the Map

- **Pan:** Click and drag anywhere on the map to move around.
- **Zoom:** Use your mouse wheel or the `+`/`-` buttons in the top-right corner.
- **Clusters:** Where you have many photos close together, Placemark groups them into circles with a number.
  - **Blue/Yellow/Red Circles:** Indicate clusters of photos. Click a cluster to zoom in.
  - **Individual Markers:** represent single photos. Hover over them to see a thumbnail preview.

### 3. Selecting Photos

**Single Selection**

- Click any photo marker to select it.

**Lasso Selection (Drag to Select)**
Select multiple photos quickly using the **Lasso Tool**:

1. Click the **Lasso Icon** in the top toolbar (or press `L` to toggle mode).
2. **Click and drag** on the map to draw a shape around the photos you want.
3. Release the mouse to complete the selection.
4. Press `Esc` or click the Lasso icon again to exit selection mode.

### 4. Using the Timeline

The Timeline at the bottom shows the distribution of your photos over time.

- **Filter by Date:**
  - **Drag** along the timeline track to define a time window.
  - The map updates to show **only** photos from that period.
  - Click outside the selected range to clear the filter.

- **Playback (Slide Show Mode):**
  - Click **Play (▶)** to animate through your photo history.
  - **Auto-Zoom:** By default, the map zooms to follow your photos. You can disable this in Settings.

### 5. Exporting Your Data

Click the **Export** button in the toolbar (Tools group) to save your photo locations to a file.

- **Scope:** If you have photos selected (via Lasso), only those are exported. Otherwise all photos currently visible on the map are exported.
- **Formats:**
  - **GeoJSON** — standard geographic data format, compatible with QGIS, Google Earth, Mapbox
  - **CSV** — spreadsheet-compatible table (filename, date, lat/lon, camera, folder path)
  - **GPX** — GPS Exchange Format, importable into navigation apps and devices
- All exports are written to a local file you choose — no data leaves your device.

### 6. Settings

Access the Settings panel via the **Gear ⚙️** icon.

- **Appearance:** Toggle Light/Dark mode.
- **Map:** Change map style (Streets, Outdoors, Dark, etc.) or enable Heatmap.
- **Storage:** Manage/Clear the local thumbnail cache.

---

## For Developers

Placemark is an open-source Electron + React + TypeScript application built with privacy and portability in mind.

### Quick Start

See [docs/SETUP.md](docs/SETUP.md) for detailed build instructions.

```bash
# Install dependencies
pnpm install

# Build core package (required first)
pnpm -C packages/core build

# Run development server with hot reload
pnpm dev
```

### Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Desktop:** Electron 41+ with secure IPC
- **Maps:** MapLibre GL JS (open-source, offline-capable)
- **Database:** SQLite via better-sqlite3
- **Monorepo:** pnpm workspaces

### Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design and patterns
- [docs/plan.md](docs/plan.md) — Implementation roadmap (9 phases)
- [docs/SETUP.md](docs/SETUP.md) — Development environment setup

### Version Management

To update the app version:

```bash
# 1. Update RELEASE_NOTES.md first with new version entry
# 2. Run version update script
pnpm run version:update 0.4.0
# 3. Commit everything together
```

This updates root `package.json`, core `package.json`, and desktop `package.json`.
The app reads version from Electron's `app.getVersion()` at runtime (no hardcoded fallbacks).

### Documentation

- **User Guide:** See [User Manual](#user-manual) above
- **Developer Docs:**
  - [SETUP.md](docs/SETUP.md) — Development environment setup
  - [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design and patterns
  - [plan.md](docs/plan.md) — Implementation roadmap (9 phases)
  - [technologydecisions.md](docs/technologydecisions.md) — Technology rationale
  - [RELEASE_NOTES.md](docs/RELEASE_NOTES.md) — Version history

### Project Status

**Current Version:** v0.8.0  
**Current Phase:** Phase 6.2 complete (pre-store)  
**Next Phase:** Stats & Filters, Microsoft Store

See [docs/plan.md](docs/plan.md) for the complete roadmap.

### License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Placemark Contributors
