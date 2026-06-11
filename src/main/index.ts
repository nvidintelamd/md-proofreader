import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, stat } from 'fs/promises'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MD校对工具',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // In dev mode, load from vite dev server
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC handlers
ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (result.canceled) return []
  
  const files = await Promise.all(
    result.filePaths.map(async (filePath) => {
      const stats = await stat(filePath)
      return {
        name: filePath.split(/[/\\]/).pop() || '',
        path: filePath,
        size: stats.size
      }
    })
  )
  return files
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const content = await readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:readImage', async (_event, mdDir: string, imagePath: string) => {
  try {
    const fullPath = join(mdDir, imagePath.replace(/^\//, ''))
    const buffer = await readFile(fullPath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'png'
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml'
    }
    const mime = mimeMap[ext] || 'image/png'
    return { success: true, dataUrl: `data:${mime};base64,${buffer.toString('base64')}` }
  } catch {
    return { success: false, dataUrl: '' }
  }
})

ipcMain.handle('fs:readProofreadState', async (_event, dir: string) => {
  try {
    const content = await readFile(join(dir, '.proofread.json'), 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
})

ipcMain.handle('fs:writeProofreadState', async (_event, dir: string, data: any) => {
  try {
    await writeFile(join(dir, '.proofread.json'), JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
