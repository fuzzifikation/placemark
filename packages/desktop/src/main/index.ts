import { app, BrowserWindow, session } from 'electron';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Store cleanup functions for window-all-closed
let closeStorage: (() => void) | undefined;
let closeThumbnailService: (() => void) | undefined;

// Set AppUserModelId so Windows groups the taskbar icon correctly
// Must match appId in electron-builder.yml
app.setAppUserModelId('com.placemark.desktop');

// Override userData path for portable mode
// In portable builds, databases live next to the .exe
// In dev mode, use standard AppData location
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
const exeDir = dirname(app.getPath('exe'));
const localDataPath = join(exeDir, 'placemark_data');

if (portableDir) {
  // NSIS Portable wrapper
  app.setPath('userData', join(portableDir, 'placemark_data'));
} else if (app.isPackaged && existsSync(localDataPath)) {
  // Unpacked portable convention: if 'placemark_data' exists next to the exe, use it
  app.setPath('userData', localDataPath);
} else if (!app.isPackaged) {
  // Dev mode: use default AppData location
  // (no change needed, but keeping this explicit for clarity)
}

let win: BrowserWindow | null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = join(__dirname, '../../dist');

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../build/icon.png'),
    show: false, // Hide initially
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Show window when ready
  win.once('ready-to-show', () => {
    win?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On non-macOS, clean up and quit
    if (closeStorage) closeStorage();
    if (closeThumbnailService) closeThumbnailService();
    app.quit();
    win = null;
  }
  // On macOS, keep services alive — user may reopen via dock icon
});

app.on('before-quit', () => {
  if (closeStorage) closeStorage();
  if (closeThumbnailService) closeThumbnailService();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  try {
    // Register handlers
    // Dynamically import heavyweight modules (SQLite, Sharp) in parallel
    const [photosModule, opsModule, storageModule, systemModule, placemarksModule, onedriveModule] =
      await Promise.all([
        import('./ipc/photos'),
        import('./ipc/operations'),
        import('./services/storage'),
        import('./ipc/system'),
        import('./ipc/placemarks'),
        import('./ipc/onedrive'),
      ]);

    // Assign cleanup functions
    closeStorage = storageModule.closeStorage;
    closeThumbnailService = photosModule.closeThumbnailService;

    // Archive old operation batches (clear undo history from previous session)
    const archivedCount = storageModule.archiveCompletedBatches();
    if (archivedCount > 0) {
      opsModule.setStartupUndoCleared(true);
    }

    // Mark any batches left 'pending' from a crashed previous run as failed.
    storageModule.failStalePendingBatches();

    // Initialize features
    photosModule.registerPhotoHandlers();
    // Note: operations handlers need mainWindow for progress events
    // Pass a getter function so it can access win after createWindow()
    opsModule.registerOperationHandlers(() => win);
    systemModule.registerSystemHandlers();
    placemarksModule.registerPlacemarksHandlers();
    onedriveModule.registerOneDriveHandlers();

    const exportModule = await import('./ipc/export');
    exportModule.registerExportHandlers();

    // Inject Referer header for map tile requests.
    // In packaged Electron the renderer loads from app://, so no Referer is sent
    // automatically. OSM and CartoCDN tile servers require it (usage policy).
    // Referer is a forbidden header in the Fetch spec so it must be injected here
    // at the network layer — renderer-side transformRequest cannot override it.
    session.defaultSession.webRequest.onBeforeSendHeaders(
      {
        urls: ['https://tile.openstreetmap.org/*', 'https://*.basemaps.cartocdn.com/*'],
      },
      (details, callback) => {
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            Referer: 'https://www.openstreetmap.org/',
          },
        });
      }
    );

    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
});
