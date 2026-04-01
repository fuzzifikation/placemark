# Placemark

**Privacy-first, local-first photo organizer for exploring your photo library by place and time.**

Placemark reads GPS coordinates and timestamps already embedded in your photo files and visualizes them on an interactive map. It is built to stay calm, predictable, and local: no Placemark cloud, no tracking, no AI inference, and no background syncing.

---

## What Placemark Does

- Browse geotagged photos on an interactive map
- Narrow results with the timeline, format filters, and camera filters
- Save recurring places and views as Placemarks
- Import from local folders, network shares, and OneDrive
- Export visible or selected photos as CSV, GeoJSON, or GPX
- Organize files with preview, rollback safety, and undo
- Stay usable from small libraries to very large archives

## Privacy Model

- **Local-first:** Photo metadata, thumbnails, placemarks, and filters stay on your device.
- **Zero Placemark infrastructure:** There is no Placemark account system or Placemark cloud.
- **Explicit cloud access:** OneDrive access is direct user-to-Microsoft communication and only happens when you connect an account.
- **Optional external services:** Map tiles and reverse geocoding can be disabled for a fully offline workflow.

## Current State

Placemark is currently at **v0.9.0** and in pre-store polish for the first Windows release.

Already working in the desktop app:

- Interactive map with clustering, spidering, and hover previews
- Timeline filtering and chronological playback
- Placemarks and saved views
- Stats & Filters panel with clickable format and camera filters
- Local-folder and OneDrive import
- Export to CSV, GeoJSON, and GPX
- Safe copy/move operations with undo

See [docs/plan.md](docs/plan.md) for the live roadmap and release status.

---

## Supported Formats

Placemark reads EXIF metadata (GPS, timestamps, and available camera data) from:

**Standard formats**

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- HEIC/HEIF (`.heic`, `.heif`)
- TIFF (`.tiff`, `.tif`)
- WebP (`.webp`)

**Professional RAW formats (experimental)**

CR2, CR3, NEF, NRW, ARW, DNG, RAF, ORF, RW2, PEF, SRW, RWL

RAW support is experimental and varies by format. TIFF-based RAW formats generally behave well; Canon CR3 GPS and thumbnail extraction remain less reliable.

## User Guide

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for day-to-day usage: adding sources, using the map and timeline, filtering, placemarks, export, and settings.

---

## For Developers

Placemark is an open-source Electron + React + TypeScript application built with privacy and portability in mind.

### Quick Start

See [docs/SETUP.md](docs/SETUP.md) for the full setup guide.

```bash
pnpm install
pnpm -C packages/core build
pnpm dev
```

### Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Desktop:** Electron 41+ with secure IPC
- **Maps:** MapLibre GL JS
- **Database:** SQLite via better-sqlite3
- **Monorepo:** pnpm workspaces

### Key Docs

- [README.md](README.md) — project overview
- [prd.md](prd.md) — product requirements
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture and design patterns
- [docs/SETUP.md](docs/SETUP.md) — development environment setup
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — end-user usage guide
- [docs/plan.md](docs/plan.md) — roadmap and implementation status
- [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) — release narrative
- [docs/business_model.md](docs/business_model.md) — pricing and monetization
- [docs/store.md](docs/store.md) — Microsoft Store submission copy

### Version Management

Update release notes first, then use the version script:

```bash
pnpm run version:update x.y.z
```

That updates the root package plus the workspace package versions. The app reads its runtime version from Electron's `app.getVersion()`.

### License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Placemark Contributors
