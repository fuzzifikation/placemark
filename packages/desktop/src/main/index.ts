import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerPhotoHandlers, closeThumbnailService } from './ipc/photos';
import { registerOperationHandlers } from './ipc/operations';
import { closeStorage } from './services/storage';

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

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = join(__dirname, '../../dist');

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../build/icon.png'),
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

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  closeStorage();
  closeThumbnailService();
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

app.whenReady().then(() => {
  registerPhotoHandlers();
  registerOperationHandlers();
  createWindow();
});
