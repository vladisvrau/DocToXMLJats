import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  openFile: () => ipcRenderer.invoke('file:open'),
  saveXml: (name: string, xml: string) => ipcRenderer.invoke('file:save-xml', name, xml),
  convertFolder: () => ipcRenderer.invoke('batch:convert-folder'),
  getLaunchFile: () => ipcRenderer.invoke('file:launch'),
  onFileOpened: (cb: (file: unknown) => void) => {
    ipcRenderer.on('file:opened', (_e, file) => cb(file));
  },
});
