import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useFileLoader() {
  const loadFiles = useCallback(async () => {
    const selectedFiles = await window.api.openFiles()
    if (selectedFiles.length === 0) return

    // Load existing session to get proofread status
    const session = await window.api.loadSession()
    const status = session.proofreadStatus || {}

    const fileList = selectedFiles.map(f => ({
      name: f.name,
      path: f.path,
      done: status[f.path] === true
    }))

    // Determine mdDir from first file
    const dir = selectedFiles[0].path.replace(/[/\\][^/\\]+$/, '')

    const { setMdDir, setFiles, setCurrentFileIndex, setCursorLine } = useAppStore.getState()
    setMdDir(dir)
    setFiles(fileList)
    setCurrentFileIndex(0)
    setCursorLine(0)

    // Save session
    await window.api.saveSession({
      filePaths: selectedFiles.map(f => f.path),
      proofreadStatus: status
    })

    // Load first file
    await loadFileContent(fileList[0].path, dir)
  }, [])

  const loadLastSession = useCallback(async () => {
    const session = await window.api.loadSession()
    if (!session.filePaths || session.filePaths.length === 0) return false

    const status = session.proofreadStatus || {}

    // Verify files still exist and build file list
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
    const { setMdDir, setFiles, setCurrentFileIndex, setCursorLine } = useAppStore.getState()
    setMdDir(dir)
    setFiles(fileList)
    setCursorLine(0)

    // Jump to first unfinished file
    const firstUnfinished = fileList.findIndex(f => !f.done)
    const targetIndex = firstUnfinished !== -1 ? firstUnfinished : 0
    setCurrentFileIndex(targetIndex)

    await loadFileContent(fileList[targetIndex].path, dir)

    // Update session with surviving files
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

  const { setLines, setCursorLine, addImageToCache } = useAppStore.getState()
  const lines = result.content.split('\n')
  setLines(lines)
  setCursorLine(0)

  const dir = mdDir || useAppStore.getState().mdDir

  // Extract markdown images
  const mdImgRegex = /!\[.*?\]\((.*?)\)/g
  let match
  while ((match = mdImgRegex.exec(result.content)) !== null) {
    const imgPath = match[1].trim()
    if (imgPath) resolveImagePath(dir, imgPath, addImageToCache)
  }

  // Extract HTML images
  const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi
  while ((match = htmlImgRegex.exec(result.content)) !== null) {
    const imgPath = match[1].trim()
    if (imgPath && !imgPath.startsWith('http') && !imgPath.startsWith('data:')) {
      resolveImagePath(dir, imgPath, addImageToCache)
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
