# Placemark

**Privacy-first, local-first photo organizer.**
Rediscover your photo collection by visualizing _where_ and _when_ your photos were taken, without ever uploading your personal moments to the cloud.

---

## Project Goals

Placemark is a privacy-first, local-first application that allows users to explore and organize their photos by where and when they were taken.

The core idea is to treat geographic location and time as explicit, user-controlled lenses on personal photo collections, without uploading photos or derived data to third-party servers.

### Primary Goals

- Allow users to visualize photos on a map based on EXIF GPS metadata.
- Support multiple photo sources (Local folders, Network shares, OneDrive).
- Enable filtering by both geographic area and date window.
- Store all derived metadata locally on the user’s device.
- Avoid background processing, inference, or tracking by default.
- Be transparent, predictable, and reversible in all operations.

---

## User Manual

### 1. Getting Started

**Launching the App**
When you open Placemark, you are greeted with a clean map interface. The data stays on your computer.

**Adding Your Photos**

1. Click the **"Add Source"** button (or the `+` icon) in the top-left sidebar.
2. Select a folder on your computer that contains photos (e.g., your "Pictures" folder).
3. Placemark will scan the folder recursively for images with GPS data (EXIF).
   - **Note:** Only photos with location data will appear on the map. Photos without GPS are counted but skipped for map display.

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

### 5. Settings

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
- **Desktop:** Electron 40+ with secure IPC
- **Maps:** MapLibre GL JS (open-source, offline-capable)
- **Database:** SQLite via better-sqlite3
- **Monorepo:** pnpm workspaces

### Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design and patterns
- [docs/plan.md](docs/plan.md) — Implementation roadmap (9 phases)
- [docs/SETUP.md](docs/SETUP.md) — Development environment setup

### Version Management

To update the app version across all files:

```bash
pnpm run version:update 0.4.0
```

This updates root `package.json`, core `package.json`, desktop `package.json`, and fallback version in `AboutSection.tsx`.

### Documentation

- **User Guide:** See [User Manual](#user-manual) above
- **Developer Docs:**
  - [SETUP.md](docs/SETUP.md) — Development environment setup
  - [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design and patterns
  - [plan.md](docs/plan.md) — Implementation roadmap (9 phases)
  - [technologydecisions.md](docs/technologydecisions.md) — Technology rationale
  - [RELEASE_NOTES.md](docs/RELEASE_NOTES.md) — Version history

### Project Status

**Current Phase:** Phase 4A Complete — Code quality improvements
**Next Phase:** Phase 5 — File operations (copy/move execution)

See [docs/plan.md](docs/plan.md) for the complete 9-phase roadmap.

### License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Placemark Contributors
