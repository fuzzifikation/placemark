import { ipcMain } from 'electron';
import { OneDriveAuthService } from '../services/onedriveAuth';
import { OneDriveGraphService } from '../services/onedriveGraph';

const authService = new OneDriveAuthService();
const graphService = new OneDriveGraphService(authService);

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

  ipcMain.handle('onedrive:listRootFolders', async () => {
    return graphService.listRootFolders();
  });

  ipcMain.handle('onedrive:getCameraRollFolder', async () => {
    return graphService.getCameraRollFolder();
  });

  ipcMain.handle('onedrive:listChildFolders', async (_event, itemId: string) => {
    if (typeof itemId !== 'string') {
      throw new Error('Cannot list OneDrive folders: invalid folder ID');
    }

    return graphService.listChildFolders(itemId);
  });
}
