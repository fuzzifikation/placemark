# Changelog

All notable changes to Placemark will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Core package filtering modules (`geographic.ts`, `temporal.ts`, `combined.ts`)
- Storage interface (`IStorage.ts`) for platform-agnostic database operations
- UI constants module for centralized styling values
- Type definitions file (`preload.d.ts`) for Window API
- `FloatingHeader` component extracted from App.tsx
- `PhotoPreviewModal` component extracted from App.tsx
- Logger service for structured logging

### Changed

- **BREAKING:** Refactored `usePhotoData` hook to use core package filters
- Reduced App.tsx complexity from 737 lines to 313 lines (58% reduction)
- Core package now exports filtering logic for mobile compatibility
- Improved code organization with single-responsibility components

### Improved

- Mobile-readiness: All filtering logic now in platform-agnostic core package
- Maintainability: Eliminated 420+ lines through better component structure
- Type safety: Centralized Window API types with proper TypeScript definitions
- Code reusability: Eliminated magic numbers with constants module

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

[Unreleased]: https://github.com/fuzzifikation/placemark/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/fuzzifikation/placemark/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fuzzifikation/placemark/releases/tag/v0.1.0
