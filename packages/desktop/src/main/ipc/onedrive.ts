import { ipcMain } from 'electron';
import { OneDriveAuthService } from '../services/onedriveAuth';
import { OneDriveGraphService } from '../services/onedriveGraph';
import { OneDriveImportService, requestOneDriveAbort } from '../services/onedriveImport';
import { setLastImportSummary } from '../services/storage';

const authService = new OneDriveAuthService();
export { authService as oneDriveAuthService };
const graphService = new OneDriveGraphService(authService);
const importService = new OneDriveImportService(authService);

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

  ipcMain.handle('onedrive:abortImport', () => {
    requestOneDriveAbort();
  });

  ipcMain.handle(
    'onedrive:importFolder',
    async (event, itemId: string, includeSubdirectories: boolean) => {
      if (typeof itemId !== 'string' || !itemId.trim()) {
        throw new Error('Cannot import from OneDrive: invalid folder ID');
      }

      const result = await importService.importFolder(
        itemId.trim(),
        includeSubdirectories === true,
        (progress) => {
          event.sender.send('onedrive:importProgress', progress);
        }
      );

      setLastImportSummary({
        source: 'onedrive',
        scanned: result.scanned,
        imported: result.imported,
        duplicates: result.duplicates,
        completedAt: Date.now(),
      });

      return result;
    }
  );
}
