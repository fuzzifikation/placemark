# Release Notes

## v0.5.2 - Security & Quality Updates (2026-02-07)

🔒 **Dependency updates, security fixes, and GPS data validation.**

### 🔒 Security

- **Resolved `@isaacs/brace-expansion` vulnerability** (high severity — uncontrolled resource consumption). Added resolution override to force patched version 5.0.1.
- **Updated all dependencies** to latest versions: Electron 40.2.1, React 19.2.4, MapLibre GL 5.17.0, electron-builder 26.7.0, and more.
- **Zero known vulnerabilities** per `pnpm audit`.

### 🐛 Bug Fixes

- **GPS (0, 0) rejection:** Photos with exactly (0.000000, 0.000000) coordinates are now treated as having no GPS data. This coordinate is almost always a firmware/metadata error, not a real photo location.

### 📝 Documentation

- **Product Requirements Document (PRD):** Added comprehensive `prd.md` covering all functional and non-functional requirements with completion status.
- **Removed network share requirements** from PRD — the OS folder picker already handles mounted drives and UNC paths transparently.
- **Updated MV-9 requirement** to accurately reflect implemented map style support (light/dark tile adaptation).

### 🔧 Technical

- **Core package purity:** Replaced `crypto.randomUUID()` with pure JS UUID generator in core package (no Node.js dependency).
- **Dependency updates:** electron-builder-squirrel-windows 26.7.0, @electron/rebuild 4.0.3, @types/node 25.2.1, @vitejs/plugin-react 5.1.3, @types/react 19.2.13.

---

## v0.5.1 - File Operations Simplification (2026-02-05)

🧹 **Code quality refactoring:** Simplified file operations architecture, removed dead code, and fixed identical-file handling.

### 🐛 Bug Fixes

- **Identical file handling:** Files that already exist at destination with the same size are now treated as success (skip) rather than a conflict. This matches the expected behavior of "don't overwrite identical files."

### 🏗️ Architecture Improvements

- **Removed duplicate validation:** The `executeOperations` function no longer re-validates files that were already checked during dry-run. Uses `COPYFILE_EXCL` as a safety net for race conditions.
- **Removed dead code (~140 lines):**
  - Deleted unused `OperationLogEntry` interface from core
  - Deleted 6 unused `operation_log` functions from storage service
  - Removed obsolete operation log methods from `IStorage` interface
  - Deleted outdated `PHASE5_FILE_OPERATIONS.md` requirements document
- **Simplified types:** Removed unused `ConflictError` type and `'validating'` phase

### 📊 Code Metrics

| File                     | Before | After | Reduction |
| ------------------------ | ------ | ----- | --------- |
| `services/operations.ts` | 544    | 399   | -27%      |
| `services/storage.ts`    | 439    | 349   | -20%      |
| `models/Operation.ts`    | 49     | 38    | -22%      |

---

## v0.5.0 - File Operations Execution (2026-02-02)

✨ **Phase 5 Complete:** Full file copy/move execution with atomic batch operations, undo support, and database sync.

### 🎯 New Features

- **File Operations Execution:**
  - Copy and move operations now fully functional (Phase 5)
  - Atomic batch semantics: all files succeed or operation rolls back
  - Conflict detection: never overwrites existing files
  - Same-file detection: silently skips files already at destination
  - Progress tracking with file-by-file updates
  - Cross-device move support with verification

- **Undo System:**
  - Batch undo: reverse entire copy/move operation at once
  - OS Trash integration: undo copy sends files to Recycle Bin/Trash (recoverable)
  - Move undo: restores files to original location
  - Session-based: undo history clears on app restart
  - Automatic archival: old operations marked 'archived' (no indefinite undo stacking)

- **Database Synchronization:**
  - Move operations update photo paths in database
  - UI automatically refreshes after move/undo to show correct paths
  - Photos table stays in sync with actual file locations
  - Operation batches tracked with photo IDs for reliable updates

### 🏗️ Architecture Improvements

- **Core Package:**
  - Renamed `dryrun.ts` → `planner.ts` for clarity
  - Renamed `generateDryRun()` → `generateOperationPlan()`
  - Added `photoId` field to `FileOperation` type
  - Updated comments and documentation throughout

- **Database Schema:**
  - Migration v3: Added `operation_batch` and `operation_batch_files` tables
  - Migration v4: Added `photo_id` column to batch files
  - Added 'archived' status for historical operations

- **Safety Mechanisms:**
  - Pre-flight validation: checks all files before touching anything
  - Rollback on failure: completed files restored if mid-batch error
  - Cross-device copy verification: checks file size before deleting source
  - Graceful error handling: partial failures don't corrupt state

### 📝 Documentation

- **Updated plan.md:** Phase 4A complete, Phase 5 in progress
- **Added backlog items:**
  - Moved photos scope decision (keep tracking vs. remove from DB)
  - Operation history/tracing UI (export capability, auto-prune)
- **Code comments:** Modernized planner.ts documentation

### 🔧 Technical Details

- Operation flow: validate → log batch → execute → update DB → refresh UI
- Undo flow: retrieve batch → move files → update DB → mark undone → refresh UI
- Session cleanup: `archiveCompletedBatches()` runs on app startup
- UI refresh: `onRefreshPhotos` callback reloads photo data after move operations

---

## v0.4.1 - Critical Bug Fixes & Security Hardening (2026-02-02)

🔒 **Critical bug fixes and security improvements** - fixed coordinate handling bug, hardened IPC security, and improved version management.

### 🐛 Critical Bug Fixes

- **Fixed latitude/longitude 0 bug:** Photos at equator (lat=0) or prime meridian (lon=0) were incorrectly filtered out
  - Fixed in `filesystem.ts` photo counting
  - Fixed in `useMapLayerManagement.ts` map filtering
  - Now correctly handles valid coordinates like (0, 0) Gulf of Guinea
- **Fixed version reporting:** Replaced brittle `process.cwd()` package.json reads with stable `app.getVersion()`
  - Removed hardcoded fallback versions from AboutSection.tsx
  - Version now works reliably in dev and packaged builds
- **Fixed native dependency builds:** Removed `better-sqlite3` from `ignoredBuiltDependencies`
  - Added `postinstall` script to rebuild native modules for Electron's Node ABI
  - Prevents "module version mismatch" errors across Node/Electron updates

### 🔒 Security Improvements

- **IPC attack surface hardening:** Renderer now passes photo IDs instead of raw paths/objects
  - `photos:openInViewer` and `photos:showInFolder` accept `photoId`, fetch canonical path from SQLite
  - `ops:generateDryRun` accepts photo IDs array, fetches Photo objects from database
  - Added strict `opType` validation (only 'copy' or 'move')
  - Added destination path validation (absolute, writable, not system folders)
  - Prevents arbitrary path access and object injection attacks

### 📝 Documentation

- **Privacy Guarantees:** Added clear privacy statements to README and About section
  - No server backend, no uploads to Placemark infrastructure
  - All data stored locally on device
  - Map tiles loaded from internet, but no photo data transmitted
- **Version Management:** Simplified update script (3 files instead of 4)
  - Removed AboutSection.tsx from update list (uses `app.getVersion()` now)
  - Updated documentation to reflect streamlined process

### 🛠️ Developer Experience

- **Improved error messages:** IPC handlers now provide clear validation errors
- **Database helpers:** Added `getPhotoById()` and `getPhotosByIds()` functions
- **Code quality:** Zero TypeScript errors, all validation logic centralized

---

## v0.4.0 - Documentation Cleanup (2026-02-02)

📚 **Streamlined documentation** for a personal project - removed overkill corporate docs and enhanced architecture visualization.

### 📖 Documentation Changes

- **Removed Overkill Docs:** Deleted CODE_OF_CONDUCT.md, CONTRIBUTING.md, CODE_QUALITY_AUDIT.md, PR template, technologydecisions.md (unnecessary for personal project)
- **Enhanced ARCHITECTURE.md:** Added 3 professional Mermaid diagrams:
  - High-level system architecture (Electron processes, IPC flow)
  - Photo scanning sequence diagram
  - Settings persistence flow
- **Streamlined Navigation:** Clean documentation structure with README → ARCHITECTURE → plan → SETUP
- **Updated Copilot Instructions:** Reflects Phase 4A completion status

### 🎯 Philosophy

**"The architecture should speak for itself"** - Clean code with visual diagrams instead of verbose policy documents. Perfect for a personal project that values simplicity over bureaucracy.

### 📦 What Remains

- **README.md** - User manual + developer quick start
- **ARCHITECTURE.md** - System design with Mermaid diagrams ⭐
- **plan.md** - 9-phase implementation roadmap
- **SETUP.md** - Development environment setup
- **RELEASE_NOTES.md** - Version history (this file)

---

## v0.3.0 - UI Polish & Visual Feedback (2026-01-31)

🎨 **Major UI enhancements** with comprehensive visual feedback improvements and polished interactions.

### ✨ New Features

- **Enhanced Visual Feedback:** All interactive elements now provide smooth hover effects and animations
- **FloatingHeader Animations:** Buttons scale and change appearance on hover for better user experience
- **Map Marker Hover States:** Dynamic marker styling using MapLibre's feature-state API
- **Timeline Slider Improvements:** Thumbs with drag feedback animations and improved responsiveness
- **Clean Timeline Design:** Reverted to simple vertical bars for consistent, professional appearance

### 🔧 Technical Improvements

- **Type Safety:** Fixed type safety issues by replacing `any` types with proper `ThemeColors` interface
- **Performance:** Optimized hover state management for smooth 60fps animations
- **Accessibility:** Improved focus states and keyboard navigation support

### 🎯 User Experience

- **Intuitive Interactions:** Clear visual cues for all clickable elements
- **Smooth Animations:** Cubic-bezier easing functions for professional feel
- **Consistent Design:** Unified hover effects across the entire application
- **Responsive Feedback:** Immediate visual response to user actions

---

## v0.2.1 - Architectural Improvements (Unreleased)

### 🔧 Technical Improvements

- **Mobile-Ready Architecture:** Extracted all filtering logic to platform-agnostic core package
- **Storage Interface:** Created `IStorage` abstraction for future React Native compatibility
- **Component Refactoring:** Reduced App.tsx from 737 to 313 lines (58% reduction)
- **Type Safety:** Centralized Window API types in dedicated `preload.d.ts` file
- **Code Organization:** New components: `FloatingHeader`, `PhotoPreviewModal`
- **Constants Module:** Eliminated magic numbers with centralized UI constants
- **Logger Service:** Structured logging foundation (ready to replace console.log)

### 📦 New Core Modules

- `@placemark/core/filters/geographic` - Bounding box logic with IDL support
- `@placemark/core/filters/temporal` - Date range filtering
- `@placemark/core/filters/combined` - Combined geographic + temporal filters
- `@placemark/core/storage/IStorage` - Platform-agnostic database interface
- `@placemark/core/storage/queries` - SQL query builders

### 🎯 Impact

- **Phase 9 Readiness:** Core logic can now be shared with React Native mobile app
- **Maintainability:** Single-responsibility components, cleaner separation of concerns
- **Testability:** Pure TypeScript functions in core package can be unit tested
- **Scalability:** Foundation for 100k+ photo performance optimizations

---

## v0.2.0 - Alpha Release

🎉 **Second Alpha Release** with major UI improvements and Portable Mode.

## New in v0.2.0

### 🚀 Portable Mode

- Placemark is now a **portable application**. No installation required.
- All data (databases, cache) is stored in a `placemark_data` folder next to the executable.
- Perfect for running from a USB drive or keeping your system clean.

### 🎨 UI & Experience

- **Mobile-Friendly Toggles:** Replaced checkboxes with smooth switches.
- **Clustering Controls:** New settings to toggle clustering, adjust radius, and use heatmap.
- **Dark/Light Mode:** Heatmap now works beautifully on both themes.
- **Menu Bar:** Auto-hidden for a cleaner look.
- **Scrollbars:** Hidden global scrollbars for a native feel.

### 🛠️ Improvements & Fixes

- **Smart Spiderify:** Photos at the exact same location now "spider out" so you can click them individually.
- **Zoom Limit Fix:** Map no longer goes blank when zooming too far deep.
- **Thumbnail Cache:** In-memory caching for instant hover previews.
- **Database Management:** "Clear All App Data" replaced with safe "Open Data Folder" button.
- **Performance:** Optimized MapView event listeners and render logic.

## Core Features

- 📂 Scan local photo folders and extract EXIF GPS + timestamps
- 🗺️ Interactive MapLibre map with photo markers
- ⏱️ Timeline view with play controls and date filtering
- 🖼️ Thumbnail caching system (400px JPEG)
- 🔍 Hover preview tooltips on map markers

## ⚠️ Important Notes

- This is an **unsigned** Windows build - you might see a "Windows protected your PC" popup.
- Click "More info" → "Run anyway" to launch.
- This is alpha software.

## Installation

1. Download **Placemark-0.2.0-portable.exe** from Assets below.
2. Move it to a folder of your choice (e.g. `D:\MyPhotos\Placemark`).
3. Double-click to run.
4. Data will be created in `placemark_data` next to the file.

## Requirements

- Windows 10/11 (64-bit)
- ~200MB disk space for app + thumbnail cache

## Known Limitations

- Windows only
- Local folders only (OneDrive integration in Phase 7)
- No file operations yet (copy/move coming in Phase 4)

## What's Next

Phase 4 will add file operations (copy/move photos based on location/date selection).

Report issues at: https://github.com/fuzzifikation/placemark/issues
