import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useFileLoader() {
  const loadFiles = useCallback(async () => {
    const selectedFiles = await window.api.openFiles()
    if (selectedFiles.length === 0) return

    const session = await window.api.loadSession()
    const status = session.proofreadStatus || {}

    const fileList = selectedFiles.map(f => ({
      name: f.name,
      path: f.path,
      done: status[f.path] === true
    }))

    const dir = selectedFiles[0].path.replace(/[/\\][^/\\]+$/, '')
    const { setMdDir, setFiles, setCurrentFileIndex } = useAppStore.getState()
    setMdDir(dir)
    setFiles(fileList)
    setCurrentFileIndex(0)

    await window.api.saveSession({
      filePaths: selectedFiles.map(f => f.path),
      proofreadStatus: status
    })

    await loadFileContent(fileList[0].path, dir)
  }, [])

  const loadLastSession = useCallback(async () => {
    const session = await window.api.loadSession()
    if (!session.filePaths || session.filePaths.length === 0) return false

    const status = session.proofreadStatus || {}

    const fileList: { name: string; path: string; done: boolean }[] = []
    for (const filePath of session.filePaths) {
      const result = await window.api.readFile(filePath)
      if (result.success) {
        fileList.push({
          name: filePath.split(/[/\\]/).pop() || '',
          path: filePath,
          done: status[filePath] === true
        })
      }
    }

    if (fileList.length === 0) return false

    const dir = fileList[0].path.replace(/[/\\][^/\\]+$/, '')
    const { setMdDir, setFiles, setCurrentFileIndex } = useAppStore.getState()
    setMdDir(dir)
    setFiles(fileList)

    const firstUnfinished = fileList.findIndex(f => !f.done)
    const targetIndex = firstUnfinished !== -1 ? firstUnfinished : 0
    setCurrentFileIndex(targetIndex)

    await loadFileContent(fileList[targetIndex].path, dir)

    await window.api.saveSession({
      filePaths: fileList.map(f => f.path),
      proofreadStatus: status
    })

    return true
  }, [])

  return { loadFiles, loadFileContent, loadLastSession }
}

export async function loadFileContent(filePath: string, mdDir?: string) {
  const result = await window.api.readFile(filePath)
  if (!result.success || !result.content) return

  const state = useAppStore.getState()

  // Restore per-file state (editRange, editedRange, undoStack, cursorLine)
  state.restoreFileState(filePath)

  const lines = result.content.split('\n')
  state.setLines(lines)

  // If no saved cursor, start at 0
  if (!state.fileStates[filePath]) {
    state.setCursorLine(0)
  }

  const dir = mdDir || state.mdDir

  // Extract markdown images
  const mdImgRegex = /!\[.*?\]\((.*?)\)/g
  let match
  while ((match = mdImgRegex.exec(result.content)) !== null) {
    const imgPath = match[1].trim()
    if (imgPath) resolveImagePath(dir, imgPath, state.addImageToCache)
  }

  // Extract HTML images
  const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi
  while ((match = htmlImgRegex.exec(result.content)) !== null) {
    const imgPath = match[1].trim()
    if (imgPath && !imgPath.startsWith('http') && !imgPath.startsWith('data:')) {
      resolveImagePath(dir, imgPath, state.addImageToCache)
    }
  }
}

async function resolveImagePath(
  mdDir: string,
  imagePath: string,
  addImageToCache: (key: string, url: string) => void
) {
  const cacheKey = `${mdDir}::${imagePath}`
  try {
    const result = await window.api.readImage(mdDir, imagePath)
    if (result.success && result.dataUrl) {
      addImageToCache(cacheKey, result.dataUrl)
    }
  } catch {
    // ignore
  }
}
