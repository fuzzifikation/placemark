import { ipcMain } from 'electron';
import { OneDriveAuthService } from '../services/onedriveAuth';

const authService = new OneDriveAuthService();

export function registerOneDriveHandlers(): void {
  ipcMain.handle('onedrive:login', async () => {
    return authService.login();
  });

  ipcMain.handle('onedrive:logout', async () => {
    await authService.logout();
    return { ok: true };
  });

  ipcMain.handle('onedrive:getConnectionStatus', async () => {
    return authService.getConnectionStatus();
  });

  // Main-process-only helper for future Graph calls in import/browse workflows.
  ipcMain.handle('onedrive:getAccessToken', async () => {
    return authService.getAccessToken();
  });
}
