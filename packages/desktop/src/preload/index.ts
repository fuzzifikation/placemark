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
    clearDatabase: () => ipcRenderer.invoke('photos:clearDatabase'),
    onScanProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('photos:scanProgress', listener);
      return () => ipcRenderer.removeListener('photos:scanProgress', listener);
    },
  },
});
