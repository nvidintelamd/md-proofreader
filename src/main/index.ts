import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { readFile, writeFile, stat, mkdir } from 'fs/promises'

let mainWindow: BrowserWindow | null = null

const userDataPath = app.getPath('userData')
const sessionPath = join(userDataPath, 'session.json')

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    title: 'MD校对工具',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  Menu.setApplicationMenu(null)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Session state: stores opened files + proofread status
interface SessionData {
  filePaths: string[]
  proofreadStatus: Record<string, boolean>  // path -> done
}

async function readSession(): Promise<SessionData> {
  try {
    const content = await readFile(sessionPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { filePaths: [], proofreadStatus: {} }
  }
}

async function writeSession(data: SessionData): Promise<void> {
  try {
    await mkdir(userDataPath, { recursive: true })
    await writeFile(sessionPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write session:', err)
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

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    await writeFile(filePath, content, 'utf-8')
    return { success: true }
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

// Session IPC — all stored in program userData directory
ipcMain.handle('session:load', async () => {
  return readSession()
})

ipcMain.handle('session:save', async (_event, data: SessionData) => {
  await writeSession(data)
})

ipcMain.handle('session:markDone', async (_event, filePath: string) => {
  const session = await readSession()
  session.proofreadStatus[filePath] = true
  await writeSession(session)
  return session
})

ipcMain.handle('session:resetFile', async (_event, filePath: string) => {
  const session = await readSession()
  delete session.proofreadStatus[filePath]
  await writeSession(session)
  return session
})

// Window control IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
