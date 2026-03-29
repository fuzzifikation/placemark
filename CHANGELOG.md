# Changelog

All notable changes to Placemark will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Export (CSV / GeoJSON / GPX):** Export button in toolbar opens a format picker popover. Exports only GPS-tagged photos. Selection-aware: selected photos are exported when a lasso selection is active; otherwise the current map view is exported. All exports are local file writes via the OS save dialog.
- Core export formatters (`toCsv`, `toGeoJson`, `toGpx`) in `@placemark/core` — pure functions, no I/O, 21 unit tests.

## [0.7.1] - 2026-03-16

### Added

- Redesigned FloatingHeader control bar with five logical groups and visual dividers
- Rollup CVE override (GHSA-mw96-cpmx-2vgc) pinned via pnpm resolutions

### Changed

- All workflow buttons now uniform: outlined border, icon + text label
- "Add Folder" renamed to "Add" with FolderPlus icon; trash action labelled "Clear"
- Button order reflects user workflow: Clear/Add → Timeline → Select/Organize → Stats/Settings
- Electron 40 → 41
- electron-builder 26.7.0 → 26.8.1 (security: tar, minimatch CVEs)
- better-sqlite3 12.6.2 → 12.8.0
- maplibre-gl 5.17.0 → 5.20.1
- lucide-react 0.563.0 → 0.577.0
- vitest 4.0.18 → 4.1.0

## [0.6.0] - 2026-02-08

### Added

- Locale-aware date/time/number formatting using OS regional format setting
- New `formatLocale.ts` utility with `formatDate()`, `formatDateTime()`, `formatDateWithOptions()`, `formatNumber()` helpers
- New `system:getSystemLocale` IPC channel exposing `app.getSystemLocale()`
- System locale initialization on app startup via `initSystemLocale()`

### Changed

- All renderer date formatting now uses centralised locale-aware helpers
- Core `getDateString()` accepts optional `locale` parameter

## [0.3.3] - 2026-02-02

### Added

- Version management system: Single command to update versions across all files
- Runtime version reading: App version now read from package.json at runtime instead of hardcoded
- `pnpm run version:update <version>` script for easy version management

### Changed

- Simplified version management: No more manual updates across multiple files

## [0.3.2] - 2026-02-02

### Fixed

- Timeline playback speed can now be changed during playback without stopping
- Improved timeline controls UX by allowing speed cycling at any time

## [0.3.1] - 2026-02-02

### Fixed

- Timeline animation bug: End-bars (vertical thumbs) now move synchronously with the horizontal range bar during playback mode
- Improved timeline UI cohesion by treating all timeline elements as a single animated unit

## [0.3.0] - 2026-01-31

### Added

- Enhanced UI visual feedback with hover effects and animations across all interactive elements
- FloatingHeader buttons now scale and change appearance on hover for better user experience
- Map marker hover states using MapLibre feature-state API for dynamic styling
- Timeline slider thumbs with drag feedback animations and improved responsiveness

### Changed

- Timeline thumbs reverted to simple vertical bars for cleaner, more consistent design
- Improved type safety by replacing `any` types with proper `ThemeColors` interface

### Fixed

- Type safety issues in FloatingHeader component (colors prop typing)

## [0.2.0] - 2026-01-28

### Added

- Portable Mode: No installation required, runs from USB drives
- Mobile-friendly toggles for settings
- Clustering controls with radius adjustment
- Heatmap visualization mode
- Dark/Light theme support
- Smart Spiderify for overlapping photos
- Thumbnail cache with in-memory storage (50 thumbnails)
- Hover preview tooltips on map markers
- Timeline with play controls and date filtering

### Changed

- Auto-hide menu bar for cleaner UI
- Hide global scrollbars for native feel
- "Clear All" replaced with "Open Data Folder" button

### Fixed

- Map no longer goes blank when zooming too deep
- Zoom limit properly enforced
- Performance optimizations for MapView event listeners

## [0.1.0] - 2026-01-15

### Added

- Initial release
- Photo scanning with EXIF GPS extraction
- Interactive map display with MapLibre
- Basic photo management features
- SQLite storage for metadata
- Timeline view with date range filtering

[Unreleased]: https://github.com/fuzzifikation/placemark/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/fuzzifikation/placemark/compare/v0.5.2...v0.6.0
[0.3.3]: https://github.com/fuzzifikation/placemark/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/fuzzifikation/placemark/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/fuzzifikation/placemark/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/fuzzifikation/placemark/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/fuzzifikation/placemark/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fuzzifikation/placemark/releases/tag/v0.1.0
