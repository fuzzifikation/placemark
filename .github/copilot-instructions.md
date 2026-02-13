# Copilot Instructions for Placemark

Privacy-first, local-first photo organizer. Read [README.md](../README.md) for scope, [docs/plan.md](../docs/plan.md) for roadmap.

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

## Version Management

**CRITICAL:** Always use the automated version update script - never manually edit version numbers.

**Workflow for version bumps:**

1. **Update RELEASE_NOTES.md first** with the new version entry
2. Run `pnpm run version:update x.y.z` (patch: bug fixes, minor: features, major: breaking changes)
3. Commit everything together with a descriptive message

- **Version locations:** Root package.json, packages/core/package.json, packages/desktop/package.json
- **Runtime reading:** App version is read via Electron's `app.getVersion()` (stable, no file I/O)
- **Validation:** Script validates version format (x.y.z) and updates all package.json files atomically

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

## Build & Cache Management

**CRITICAL:** Never apply "simple fixes" or workarounds for suspected cache/build issues.

**If you suspect stale cache:**

- Clear Vite cache: `Remove-Item -Recurse -Force packages/desktop/node_modules/.vite`
- Clear build output: `Remove-Item -Recurse -Force packages/desktop/dist-electron`
- Reinstall modules: `Remove-Item -Recurse -Force node_modules; pnpm install`
- Rebuild native modules: `npx @electron/rebuild`

**Never work around suspected benign errors** - fix the root cause.

## Testing

- **Unit tests (Vitest):** Core package filters, validators, query builders
- **Integration tests:** EXIF extraction with sample photos, SQLite queries
- **E2E tests (Playwright):** Full desktop app workflow (Phase 8+)

**Run before every commit:**

```bash
pnpm -C packages/core test              # Core unit tests (must pass)
```

**Current test coverage (packages/core):**

- `filters/geographic.test.ts` — bounding box filtering, IDL crossing, null coords, SQL generation
- `filters/combined.test.ts` — composed query delegation, NOT NULL clauses, empty filter
- `operations/planner.test.ts` — batch filename collisions, path separators, empty input, size sums
- `operations/validator.test.ts` — same-path rejection, dest-inside-source, mixed separators, root/empty paths

When modifying core logic, **add or update tests** for the changed behavior.

## Code Review & Simplification Protocol

**MANDATORY BEFORE EVERY COMMIT:** Perform this review:

### 1. **Complexity Reduction**

- Remove unnecessary abstractions and duplicate logic
- Prefer straightforward solutions over clever code
- Keep functions under 50 lines

### 2. **Logic Validation**

- Test edge cases and error handling
- Verify data flow correctness
- Check for off-by-one errors and null pointer issues

### 3. **Security & Safety**

- Validate file paths and user inputs
- Ensure SQL queries use prepared statements
- Verify IPC isolation and input sanitization

### 4. **Code Quality**

- Fix all TypeScript/ESLint errors and warnings
- Remove unused imports and variables
- No `any` types without justification
- Extract magic numbers to named constants

### 5. **Run Tests**

- Run `pnpm -C packages/core test` — all tests must pass before committing.
- If core logic was changed, add or update relevant tests.

### 6. **Version Check**

Use `pnpm run version:update x.y.z` for version bumps (patch: bug fixes, minor: features).

**Report findings explicitly. Keep code simple - split files over 200 lines.**

## Database Compatibility

**Placemark is in alpha.** There is no database migration compatibility guarantee across versions. Schema migrations may be stubbed or destructive.

- If a version changes the database schema, **instruct users to delete and rebuild** their database (`placemark.db` and `thumbnails.db` in the app data folder).
- Do not invest effort in backward-compatible migrations until post-1.0.
- Photo data is always rebuildable by re-scanning source folders.

## Implementation Phase

Currently in **Phase 5 Complete** — full file operations with atomic batch semantics and undo. Phase 5.5 (RAW support) is next. See [docs/plan.md](../docs/plan.md) for 17-phase roadmap.

**Pre-store:** Phase 5.5 (RAW) → Phase 6 (Export) → Phase 7 (Collections & Stats) → Phase 8 (Polish & Store Readiness) → 🏪 **v1.0 Microsoft Store Launch**
**Post-store:** Phase 9 (Trip Detection) → Phase 10 (GPS Editing) → Phase 11–17 (Duplicates, Network, Import, Timestamps, OneDrive, Advanced, Mobile)

Prioritize: **clarity > performance**, **safety > convenience**, **explicit > automatic**.

Placemark should feel trustworthy, predictable, and calm.
