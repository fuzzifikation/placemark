import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  photos: {
    scanFolder: (includeSubdirectories: boolean, maxFileSizeMB: number) =>
      ipcRenderer.invoke('photos:scanFolder', includeSubdirectories, maxFileSizeMB),
    abortScan: () => ipcRenderer.invoke('photos:abortScan'),
    getWithLocation: () => ipcRenderer.invoke('photos:getWithLocation'),
    getDateRange: () => ipcRenderer.invoke('photos:getDateRange'),
    getCountWithLocation: () => ipcRenderer.invoke('photos:getCountWithLocation'),
    openInViewer: (photoId: number) => ipcRenderer.invoke('photos:openInViewer', photoId),
    showInFolder: (photoId: number) => ipcRenderer.invoke('photos:showInFolder', photoId),
    showMultipleInFolder: (filePaths: string[]) =>
      ipcRenderer.invoke('photos:showMultipleInFolder', filePaths),
    getDatabaseStats: () => ipcRenderer.invoke('photos:getDatabaseStats'),
    getLibraryStats: () => ipcRenderer.invoke('photos:getLibraryStats'),
    getPhotosWithIssues: () => ipcRenderer.invoke('photos:getPhotosWithIssues'),
    clearDatabase: () => ipcRenderer.invoke('photos:clearDatabase'),
    getHistogram: (minDate: number, maxDate: number, bucketCount: number, gpsOnly: boolean) =>
      ipcRenderer.invoke('photos:getHistogram', minDate, maxDate, bucketCount, gpsOnly),
    onScanProgress: (
      callback: (progress: {
        currentFile: string;
        processed: number;
        total: number;
        startTime?: number;
        eta?: number;
      }) => void
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        progress: {
          currentFile: string;
          processed: number;
          total: number;
          startTime?: number;
          eta?: number;
        }
      ) => callback(progress);
      ipcRenderer.on('photos:scanProgress', listener);
      return () => ipcRenderer.removeListener('photos:scanProgress', listener);
    },
  },
  thumbnails: {
    get: (photoId: number) => ipcRenderer.invoke('thumbnails:get', photoId),
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
    onProgress: (
      callback: (progress: {
        totalFiles: number;
        completedFiles: number;
        currentFile: string;
        percentage: number;
        phase: string;
      }) => void
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        progress: {
          totalFiles: number;
          completedFiles: number;
          currentFile: string;
          percentage: number;
          phase: string;
        }
      ) => callback(progress);
      ipcRenderer.on('ops:progress', listener);
      return () => ipcRenderer.removeListener('ops:progress', listener);
    },
  },
  system: {
    openAppDataFolder: () => ipcRenderer.invoke('system:openAppDataFolder'),
    getAppVersion: () => ipcRenderer.invoke('system:getAppVersion'),
    getSystemLocale: () => ipcRenderer.invoke('system:getSystemLocale'),
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
    reverseGeocode: (lat: number, lng: number) =>
      ipcRenderer.invoke('system:reverseGeocode', lat, lng),
    checkVersionStamp: () => ipcRenderer.invoke('system:checkVersionStamp'),
    acceptVersionStamp: () => ipcRenderer.invoke('system:acceptVersionStamp'),
    wipeAndRestart: () => ipcRenderer.invoke('system:wipeAndRestart'),
  },
  placemarks: {
    getAll: () => ipcRenderer.invoke('placemarks:getAll'),
    create: (input: unknown) => ipcRenderer.invoke('placemarks:create', input),
    update: (input: unknown) => ipcRenderer.invoke('placemarks:update', input),
    delete: (id: number) => ipcRenderer.invoke('placemarks:delete', id),
    setGeoLabel: (id: number, label: string) =>
      ipcRenderer.invoke('placemarks:setGeoLabel', id, label),
  },
  onedrive: {
    login: () => ipcRenderer.invoke('onedrive:login'),
    logout: () => ipcRenderer.invoke('onedrive:logout'),
    getConnectionStatus: () => ipcRenderer.invoke('onedrive:getConnectionStatus'),
    listRootFolders: () => ipcRenderer.invoke('onedrive:listRootFolders'),
    getCameraRollFolder: () => ipcRenderer.invoke('onedrive:getCameraRollFolder'),
    listChildFolders: (itemId: string) => ipcRenderer.invoke('onedrive:listChildFolders', itemId),
    importFolder: (itemId: string, includeSubdirectories: boolean) =>
      ipcRenderer.invoke('onedrive:importFolder', itemId, includeSubdirectories),
    abortImport: () => ipcRenderer.invoke('onedrive:abortImport'),
    onImportProgress: (
      callback: (progress: {
        scanned: number;
        imported: number;
        duplicates: number;
        total: number;
        currentFile: string;
      }) => void
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        progress: {
          scanned: number;
          imported: number;
          duplicates: number;
          total: number;
          currentFile: string;
        }
      ) => callback(progress);
      ipcRenderer.on('onedrive:importProgress', listener);
      return () => ipcRenderer.removeListener('onedrive:importProgress', listener);
    },
  },
  export: {
    saveFile: (photoIds: number[], format: 'csv' | 'geojson' | 'gpx') =>
      ipcRenderer.invoke('export:saveFile', { photoIds, format }),
  },
});
