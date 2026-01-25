# Development Setup Guide

## Prerequisites

1. **Node.js** (v18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **pnpm** (v8.0.0 or higher)
   - Install: `npm install -g pnpm`
   - Verify: `pnpm --version`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify: `git --version`

## First-Time Setup

```bash
# Clone the repository
git clone https://github.com/fuzzifikation/placemark.git
cd placemark

# Install dependencies
pnpm install

# Fix Electron if needed (Windows)
cd node_modules/.pnpm/electron@28.3.3/node_modules/electron
node install.js
cd ../../../../..

# Start development server
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

### Electron fails to launch

**Windows:**
```bash
cd node_modules/.pnpm/electron@28.3.3/node_modules/electron
node install.js
cd ../../../../..
```

**macOS/Linux:**
```bash
pnpm rebuild electron
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
```

### Port 5173 already in use

Kill the existing process or change port in `packages/desktop/vite.config.ts`

## Project Structure

```
placemark/
├── packages/
│   ├── core/          # Platform-agnostic TypeScript
│   └── desktop/       # Electron app
├── .vscode/           # VSCode settings
├── plan.md            # Implementation roadmap
├── technologydecisions.md  # Architecture docs
└── projectgoal.md     # Project goals
```

## Moving Between Machines

1. Commit your changes: `git add -A && git commit -m "your message"`
2. Push to GitHub: `git push`
3. On new machine: Follow "First-Time Setup" above
4. Pull your changes: `git pull`

All your work is synced via Git. Just make sure Node.js and pnpm are installed on each machine.
