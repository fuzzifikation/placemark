# Copilot Instructions for Placemark

Placemark is a privacy-first, local-first photo organizer. Read [README.md](../README.md) for scope, [docs/plan.md](../docs/plan.md) for roadmap, and [docs/technologydecisions.md](../docs/technologydecisions.md) for architecture.

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

## Build & Cache Management

**CRITICAL:** Never apply "simple fixes" or workarounds for suspected cache/build issues.

- **If you suspect stale cache:** Clear it properly with `Remove-Item` or rebuild
- **If modules not found:** Reinstall dependencies with `pnpm install`
- **If TypeScript errors seem stale:** Run `pnpm tsc --noEmit` to verify actual errors
- **Never work around suspected benign errors** - fix the root cause
- **Don't trust hunches** - verify with build tools (tsc, pnpm, etc.)

**Proper fixes:**

- Clear Vite cache: `Remove-Item -Recurse -Force packages/desktop/node_modules/.vite`
- Clear build output: `Remove-Item -Recurse -Force packages/desktop/dist-electron`
- Reinstall modules: `Remove-Item -Recurse -Force node_modules; pnpm install`
- Rebuild native modules: `npx @electron/rebuild`

**Never do:**

- Add `// @ts-ignore` to bypass cache errors
- Add explicit types to "fix" module resolution issues
- Skip type checking because "it works in the browser"

## Testing

- **Unit tests (Vitest):** Core package filters, validators, query builders
- **Integration tests:** EXIF extraction with sample photos, SQLite queries
- **E2E tests (Playwright):** Full desktop app workflow, skip for now until Phase 3+

## Code Review & Simplification Protocol

**MANDATORY BEFORE EVERY COMMIT:**

When user requests a commit or says "let's commit", you MUST perform this full review:

### 1. **Check for Complexity Reduction**

- Remove unnecessary abstractions
- Eliminate duplicate logic
- Consolidate similar functions
- Prefer straightforward code over "clever" solutions
- Verify average function length is reasonable (< 50 lines ideal)

### 2. **Check for Logic Errors**

- Verify data flow correctness
- Test edge cases (empty inputs, null values, undefined)
- Confirm error handling is complete
- Validate assumptions about inputs/outputs
- Check for off-by-one errors, null pointer issues
- Verify loops and conditionals are correct

### 3. **Check for Redundancies**

- Look for duplicate code that could be extracted
- Check for repeated patterns across files
- Identify unnecessary re-fetching of data
- Find redundant calculations or transformations

### 4. **Check for Security Issues**

- **Path traversal:** Validate all file paths, especially user input
- **SQL injection:** Confirm all queries use prepared statements
- **XSS/injection:** Validate any data passed to renderer
- **Unsafe IPC:** Verify contextBridge properly isolates main/renderer
- **Input validation:** Check all user inputs are validated
- **Error messages:** Ensure no sensitive data in error messages
- **File operations:** Verify no unintended writes/deletes

### 5. **Fix All Errors and Warnings**

- Address all TypeScript errors
- Resolve ESLint warnings
- Check for unused imports/variables
- Verify no `any` types unless justified with comment
- Run `get_errors` tool to verify
- **Check for package/dependency warnings:**
  - Review `pnpm install` or `pnpm update` output for warnings
  - Replace deprecated packages with recommended alternatives
  - Resolve peer dependency conflicts when possible
  - Update packages using deprecated subdependencies
  - Do not ignore warnings if they can reasonably be resolved

### 6. **Check for Maintainability and Structure Improvements**

- **Magic numbers:** Extract hardcoded values into named constants with clear intent
- **Duplicate code:** Look for repeated blocks that could become helper functions
- **Function purpose:** Each function should have a single clear responsibility
- **Constants organization:** Group related constants together with comments
- **Helper extraction:** Identify reusable logic that appears in multiple places
- **Code structure:** Related functionality should be grouped and clearly separated
- **Documentation:** Constants and helpers should explain "why" not just "what"

### 7. **Final Simplification Pass**

- Review with fresh eyes after fixes
- Can any functions be shorter?
- Are variable names clear and descriptive?
- Can complex logic be extracted to well-named functions?
- Is the code self-documenting?

**Report findings explicitly:** State what you checked and what you found/fixed.

**This is a simple app - keep code simple.** If a file exceeds 200 lines, consider splitting it.

## Implementation Phase

Currently in **Phase 1** (Local File Scanning + EXIF). See [plan.md](../plan.md) for 9-phase roadmap.

When in doubt, prioritize: **clarity > performance**, **safety > convenience**, **explicit > automatic**.

Placemark should feel trustworthy, predictable, and calm.
