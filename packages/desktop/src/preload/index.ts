import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  photos: {
    scanFolder: () => ipcRenderer.invoke('photos:scanFolder'),
    getWithLocation: () => ipcRenderer.invoke('photos:getWithLocation'),
    getCountWithLocation: () => ipcRenderer.invoke('photos:getCountWithLocation'),
  },
});
