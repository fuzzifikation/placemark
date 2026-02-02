# Development Setup Guide

## Prerequisites

1. **Node.js** (v18.0.0 or higher, v24+ recommended)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **pnpm** (v8.0.0 or higher)
   - Install after Node.js: `npm install -g pnpm`
   - Configure pnpm: `pnpm setup` (adds to PATH)
   - **Important:** Restart your terminal after setup
   - Verify: `pnpm --version`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify: `git --version`

4. **Build Tools** (Windows)
   - Install Visual Studio Build Tools or Visual Studio with C++ workload
   - Required for native module compilation (better-sqlite3, sharp)

## First-Time Setup

```bash
# Clone the repository
git clone https://github.com/fuzzifikation/placemark.git
cd placemark

# Install dependencies
pnpm install

# Build core package (required first)
pnpm -C packages/core build

# Install Electron binary
cd node_modules/.pnpm/electron@40.0.0/node_modules/electron
node install.js
cd ../../../../..

# Rebuild native modules for Electron
# This compiles better-sqlite3 and sharp for Electron compatibility
$env:npm_config_target='40.0.0'
$env:npm_config_arch='x64'
$env:npm_config_target_arch='x64'
$env:npm_config_disturl='https://electronjs.org/headers'
$env:npm_config_runtime='electron'
$env:npm_config_build_from_source='true'
cd node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3
npm run install
cd ../../../../../..

# Start development server
pnpm dev
```

**Note for macOS/Linux:**

```bash
# After pnpm install and core build, use electron-rebuild instead:
npx @electron/rebuild --version 40.0.0
pnpm dev
```

## VSCode Setup

When you open the project in VSCode, you'll be prompted to install recommended extensions:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **TypeScript** - Enhanced TypeScript support
- **Tailwind CSS** - CSS IntelliSense (for future use)

Click "Install All" when prompted, or install manually from Extensions panel.

## Common Commands

```bash
# Development (hot reload)
pnpm dev

# Build all packages
pnpm build

# Build specific package
pnpm -C packages/core build
pnpm -C packages/desktop build

# Type checking
pnpm -C packages/core typecheck

# Run tests (when available)
pnpm test
```

## Troubleshooting

### Error: "Electron failed to install correctly"

**Solution:** Run Electron's install script manually:

```powershell
# Windows (PowerShell)
cd node_modules/.pnpm/electron@40.0.0/node_modules/electron
node install.js
cd ../../../../..
```

```bash
# macOS/Linux
cd node_modules/.pnpm/electron@40.0.0/node_modules/electron
node install.js
cd ../../../../..
```

### Error: "Could not locate the bindings file" or "NODE_MODULE_VERSION mismatch"

**Cause:** Native modules (better-sqlite3) were compiled for Node.js instead of Electron.

**Solution (Windows):**

```powershell
# Set environment variables for Electron build
$env:npm_config_target='40.0.0'
$env:npm_config_arch='x64'
$env:npm_config_target_arch='x64'
$env:npm_config_disturl='https://electronjs.org/headers'
$env:npm_config_runtime='electron'
$env:npm_config_build_from_source='true'

# Navigate to better-sqlite3 and rebuild
cd node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3
npm run install
cd ../../../../../..

# Try dev again
pnpm dev
```

**Solution (macOS/Linux):**

```bash
npx @electron/rebuild --version 40.0.0
```

### Error: "Failed to resolve entry for package @placemark/core"

**Cause:** Core package not built yet.

**Solution:**

```bash
pnpm -C packages/core build
```

### TypeScript errors in VSCode

1. Ensure you're using the workspace TypeScript version:
   - Cmd/Ctrl + Shift + P → "TypeScript: Select TypeScript Version"
   - Choose "Use Workspace Version"

2. Reload VSCode:
   - Cmd/Ctrl + Shift + P → "Developer: Reload Window"

### Missing dependencies after git pull

```bash
pnpm install
pnpm -C packages/core build
```

### Port 5173 already in use

Kill the existing process or change port in `packages/desktop/vite.config.ts`

### V8 Deprecation Warnings (C4996)

**Warnings like:** `warning C4996: 'v8::Object::GetAlignedPointerFromInternalField'`

**These are safe to ignore.** They come from third-party native modules (better-sqlite3) using deprecated V8 APIs. The app works correctly despite these warnings. The library maintainers will fix them in future updates.

## Project Structure

```
placemark/
├── packages/
│   ├── core/          # Platform-agnostic TypeScript
│   └── desktop/       # Electron app
├── .vscode/           # VSCode settings
├── plan.md            # Implementation roadmap
├── ARCHITECTURE.md         # Architecture docs
└── projectgoal.md     # Project goals
```

## Moving Between Machines

1. Commit your changes: `git add -A && git commit -m "your message"`
2. Push to GitHub: `git push`
3. On new machine: Follow "First-Time Setup" above
4. Pull your changes: `git pull`

All your work is synced via Git. Just make sure Node.js and pnpm are installed on each machine.
