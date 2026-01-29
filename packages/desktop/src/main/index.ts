import { app, BrowserWindow } from 'electron';
import { join } from 'path';

// Lazy load these ensuring splash screen appears immediately
// import { registerPhotoHandlers, closeThumbnailService } from './ipc/photos';
// import { registerOperationHandlers } from './ipc/operations';
// import { closeStorage } from './services/storage';

// Store cleanup functions for window-all-closed
let closeStorage: (() => void) | undefined;
let closeThumbnailService: (() => void) | undefined;

// Override userData path for portable mode
// In portable builds, databases live next to the .exe
// In dev mode, use standard AppData location
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
if (portableDir) {
  // Use a subdirectory to avoid cluttering the executable directory with Electron files
  app.setPath('userData', join(portableDir, 'placemark_data'));
} else if (!app.isPackaged) {
  // Dev mode: use default AppData location
  // (no change needed, but keeping this explicit for clarity)
}

let win: BrowserWindow | null;
let splash: BrowserWindow | null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = join(__dirname, '../../dist');

function createSplash() {
  splash = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: join(__dirname, '../../build/icon.png'),
    show: false, // Don't show until ready to prevent white flash
  });

  splash.loadFile(join(__dirname, '../../splash.html'));

  splash.once('ready-to-show', () => {
    splash?.show();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../build/icon.png'),
    show: false, // Hide initially (splash is showing)
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

  // Show window when ready and close splash
  win.once('ready-to-show', () => {
    // Destroy splash immediately when main window is ready
    splash?.destroy();
    splash = null;
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
  createSplash();
  
  // Register handlers after showing splash to prioritize UI content
  // Dynamically import heavyweight modules (SQLite, Sharp) to avoid blocking splash screen
  const photosModule = await import('./ipc/photos');
  const opsModule = await import('./ipc/operations');
  const storageModule = await import('./services/storage');

  // Assign cleanup functions
  closeStorage = storageModule.closeStorage;
  closeThumbnailService = photosModule.closeThumbnailService;

  // Initialize features
  photosModule.registerPhotoHandlers();
  opsModule.registerOperationHandlers();

  createWindow();
});
