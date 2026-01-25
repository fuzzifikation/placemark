# Copilot Instructions for Placemark

Placemark is a privacy-first, local-first photo organizer. Read [projectgoal.md](../projectgoal.md) for scope and [plan.md](../plan.md) for architecture.

## Technology Stack

- **Desktop:** Electron + TypeScript + React + Vite
- **Maps:** MapLibre GL JS (open-source, offline-capable)
- **EXIF:** exifr (fast, streaming, TypeScript-native)
- **Storage:** SQLite via better-sqlite3 (desktop), react-native-sqlite (mobile future)
- **Monorepo:** pnpm workspaces (`packages/core`, `packages/desktop`, future `packages/mobile`)

## Architecture Rules

### Core Package (`packages/core`)

**CRITICAL:** Core package must be pure TypeScript — no platform dependencies.

✅ **Allowed:**
- Pure TypeScript types, interfaces, classes
- Business logic (filters, validators, query builders)
- Data models and transformations
- Abstract interfaces (IStorage, IFileSystem)

❌ **Forbidden:**
- `import fs from 'fs'` or any Node.js APIs
- `import { Database } from 'better-sqlite3'` or native modules
- Browser APIs (`document`, `window`, DOM)
- Direct I/O operations (file reads, network calls)

**Why:** Mobile compatibility. Core logic will be shared with React Native in Phase 9+.

### Desktop Package (`packages/desktop`)

- **Main process:** Node.js APIs, IPC handlers, native modules (better-sqlite3)
- **Renderer process:** React UI, MapLibre map, communicates via IPC
- **Preload script:** Secure IPC bridge using `contextBridge`

### Data Flow

```
User Action → React Component → IPC Call → Main Process → Core Logic → SQLite
                                                         ↓
                                            (implements IStorage interface)
```

## Development Commands

```bash
pnpm install                      # Install all dependencies
pnpm -C packages/core build       # Build core package
pnpm -C packages/desktop dev      # Run desktop app with hot reload
pnpm -C packages/desktop build    # Production build
```

## Privacy & Safety Principles

- **No background operations:** User must explicitly trigger scans and operations
- **Dry-run first:** Always preview file operations before executing
- **Explicit permissions:** Never assume access to folders or OneDrive
- **Local storage only:** All metadata stays on device (SQLite)
- **No inference:** Don't guess missing GPS data unless user enables it

## File Operations

- **Copy/move are safety-critical:** Implement dry-run preview showing source → destination
- **Validate before execute:** Check destination exists, has space, is writable
- **Transactional:** Log operations in `operation_log` table, support rollback where possible
- **Progress tracking:** Stream progress via IPC, allow cancellation mid-operation

## Filtering & Selection

- **Geographic + temporal are independent:** User can filter by map bounds, date range, or both
- **Always show counts:** "152 photos selected (Jan 2023 - Mar 2023, Paris area)"
- **No automatic filtering:** Don't hide photos without GPS — show count of excluded photos

## Code Style

- **Explicit over clever:** `getPhotosInBounds()` not `query()`
- **No magic values:** Define constants for defaults
- **Prefer SQL over ORM:** Use raw SQL with prepared statements (better-sqlite3)
- **Type everything:** No `any` types except for true external unknowns
- **Error messages for users:** "Cannot access folder: permission denied" not "EACCES"

## Testing

- **Unit tests (Vitest):** Core package filters, validators, query builders
- **Integration tests:** EXIF extraction with sample photos, SQLite queries
- **E2E tests (Playwright):** Full desktop app workflow, skip for now until Phase 3+

## Implementation Phase

Currently in **Phase 0-1** setup. See [plan.md](../plan.md) for 8-phase roadmap.

When in doubt, prioritize: **clarity > performance**, **safety > convenience**, **explicit > automatic**.

Placemark should feel trustworthy, predictable, and calm.
