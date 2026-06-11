import { contextBridge, ipcRenderer } from 'electron'

const api = {
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  readImage: (mdDir: string, imagePath: string) =>
    ipcRenderer.invoke('fs:readImage', mdDir, imagePath),
  readProofreadState: (dir: string) =>
    ipcRenderer.invoke('fs:readProofreadState', dir),
  writeProofreadState: (dir: string, data: any) =>
    ipcRenderer.invoke('fs:writeProofreadState', dir, data)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
