
import { ipcMain, shell } from 'electron';

export function registerSystemHandlers() {
  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    // Basic security check: only allow http/https
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });
  
  ipcMain.handle('system:openAppDataFolder', async () => {
    // This handler might already exist in photos.ts or similar, moving it here is cleaner for future refactoring
    // But for now, we'll just add the external opener
    const appDataPath = process.env.PORTABLE_EXECUTABLE_DIR 
      ? require('path').join(process.env.PORTABLE_EXECUTABLE_DIR, 'placemark_data')
      : require('electron').app.getPath('userData');
      
    await shell.openPath(appDataPath);
  });
}
