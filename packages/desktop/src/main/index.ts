import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Lazy load these ensuring splash screen appears immediately
// import { registerPhotoHandlers, closeThumbnailService } from './ipc/photos';
// import { registerOperationHandlers } from './ipc/operations';
// import { closeStorage } from './services/storage';

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

  // Test active push message to Renderer-process
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
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
  if (closeStorage) closeStorage();
  if (closeThumbnailService) closeThumbnailService();
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
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
    const [photosModule, opsModule, storageModule, systemModule] = await Promise.all([
      import('./ipc/photos'),
      import('./ipc/operations'),
      import('./services/storage'),
      import('./ipc/system'),
    ]);

    // Assign cleanup functions
    closeStorage = storageModule.closeStorage;
    closeThumbnailService = photosModule.closeThumbnailService;

    // Archive old operation batches (clear undo history from previous session)
    storageModule.archiveCompletedBatches();

    // Initialize features
    photosModule.registerPhotoHandlers();
    // Note: operations handlers need mainWindow for progress events
    // Pass a getter function so it can access win after createWindow()
    opsModule.registerOperationHandlers(() => win);
    systemModule.registerSystemHandlers();

    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
});
