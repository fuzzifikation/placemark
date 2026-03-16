import { ipcMain, shell, app } from 'electron';
import * as path from 'path';

export function registerSystemHandlers() {
  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    // Basic security check: only allow http/https
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('system:openAppDataFolder', async () => {
    const appDataPath = process.env.PORTABLE_EXECUTABLE_DIR
      ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'placemark_data')
      : app.getPath('userData');

    await shell.openPath(appDataPath);
  });

  ipcMain.handle('system:getAppVersion', async () => {
    return app.getVersion();
  });

  ipcMain.handle('system:getSystemLocale', async () => {
    // Returns the OS regional-format locale (e.g. 'de-DE' even when
    // the display language is 'en-US').  Available since Electron 21.
    return app.getSystemLocale();
  });
}
