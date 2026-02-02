# Release Notes

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
