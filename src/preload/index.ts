import { contextBridge, ipcRenderer } from 'electron'

const api = {
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  saveImage: (mdDir: string, fileName: string, base64Data: string) =>
    ipcRenderer.invoke('fs:saveImage', mdDir, fileName, base64Data),
  readImage: (mdDir: string, imagePath: string) =>
    ipcRenderer.invoke('fs:readImage', mdDir, imagePath),

  // Session persistence (stored in program userData directory)
  loadSession: () => ipcRenderer.invoke('session:load'),
  saveSession: (data: any) => ipcRenderer.invoke('session:save', data),
  markDone: (filePath: string) => ipcRenderer.invoke('session:markDone', filePath),
  resetFile: (filePath: string) => ipcRenderer.invoke('session:resetFile', filePath),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
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
