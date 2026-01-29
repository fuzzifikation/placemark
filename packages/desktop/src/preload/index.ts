import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  photos: {
    scanFolder: (includeSubdirectories: boolean) =>
      ipcRenderer.invoke('photos:scanFolder', includeSubdirectories),
    getWithLocation: () => ipcRenderer.invoke('photos:getWithLocation'),
    getWithLocationInDateRange: (startTimestamp: number | null, endTimestamp: number | null) =>
      ipcRenderer.invoke('photos:getWithLocationInDateRange', startTimestamp, endTimestamp),
    getDateRange: () => ipcRenderer.invoke('photos:getDateRange'),
    getCountWithLocation: () => ipcRenderer.invoke('photos:getCountWithLocation'),
    openInViewer: (path: string) => ipcRenderer.invoke('photos:openInViewer', path),
    showInFolder: (path: string) => ipcRenderer.invoke('photos:showInFolder', path),
    getDatabaseStats: () => ipcRenderer.invoke('photos:getDatabaseStats'),
    clearDatabase: () => ipcRenderer.invoke('photos:clearDatabase'),
    onScanProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('photos:scanProgress', listener);
      return () => ipcRenderer.removeListener('photos:scanProgress', listener);
    },
  },
  thumbnails: {
    get: (photoId: number, photoPath: string) =>
      ipcRenderer.invoke('thumbnails:get', photoId, photoPath),
    getStats: () => ipcRenderer.invoke('thumbnails:getStats'),
    clearCache: () => ipcRenderer.invoke('thumbnails:clearCache'),
    setMaxSize: (sizeMB: number) => ipcRenderer.invoke('thumbnails:setMaxSize', sizeMB),
  },
  ops: {
    selectDestination: () => ipcRenderer.invoke('ops:selectDestination'),
    generateDryRun: (photos: any[], destPath: string, opType: string) =>
      ipcRenderer.invoke('ops:generateDryRun', photos, destPath, opType),
  },
  system: {
    openAppDataFolder: () => ipcRenderer.invoke('system:openAppDataFolder'),
  },
});
