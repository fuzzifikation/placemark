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
    openInViewer: (photoId: number) => ipcRenderer.invoke('photos:openInViewer', photoId),
    showInFolder: (photoId: number) => ipcRenderer.invoke('photos:showInFolder', photoId),
    showMultipleInFolder: (filePaths: string[]) =>
      ipcRenderer.invoke('photos:showMultipleInFolder', filePaths),
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
    generateDryRun: (photoIds: number[], destPath: string, opType: string) =>
      ipcRenderer.invoke('ops:generateDryRun', photoIds, destPath, opType),
    execute: () => ipcRenderer.invoke('ops:execute'),
    cancel: () => ipcRenderer.invoke('ops:cancel'),
    undo: () => ipcRenderer.invoke('ops:undo'),
    canUndo: () => ipcRenderer.invoke('ops:canUndo'),
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('ops:progress', listener);
      return () => ipcRenderer.removeListener('ops:progress', listener);
    },
  },
  system: {
    openAppDataFolder: () => ipcRenderer.invoke('system:openAppDataFolder'),
    getAppVersion: () => ipcRenderer.invoke('system:getAppVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  },
});
