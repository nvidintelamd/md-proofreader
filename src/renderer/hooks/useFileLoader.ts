import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useFileLoader() {
  const {
    setFiles, setCurrentFileIndex, setMdDir,
    setBlocks, setRawLines, setProofreadState,
    addImageToCache, setCursorBlock
  } = useAppStore()

  const loadFiles = useCallback(async () => {
    const selectedFiles = await window.api.openFiles()
    if (selectedFiles.length === 0) return

    // Get directory from first file
    const dir = selectedFiles[0].path.replace(/[/\\][^/\\]+$/, '')
    setMdDir(dir)

    // Read proofread state
    const state = await window.api.readProofreadState(dir)
    setProofreadState(state || {})

    // Build file list with done status
    const fileList = selectedFiles.map(f => ({
      name: f.name,
      path: f.path,
      done: state?.[f.path] === true
    }))
    setFiles(fileList)
    setCurrentFileIndex(0)
    setCursorBlock(0)

    // Load first file
    if (fileList.length > 0) {
      await loadFileContent(fileList[0].path, dir)
    }
  }, [])

  const loadFileContent = useCallback(async (filePath: string, mdDir?: string) => {
    const result = await window.api.readFile(filePath)
    if (!result.success) return

    const content = result.content
    const lines = content.split('\n')
    setRawLines(lines)

    // Dynamic import to avoid circular deps
    const { parseMdToBlocks } = await import('../lib/mdParser')
    const blocks = parseMdToBlocks(content)
    setBlocks(blocks)
    setCursorBlock(0)

    // Resolve images
    const dir = mdDir || useAppStore.getState().mdDir
    const imageRegex = /!\[.*?\]\((.*?)\)/g
    let match
    while ((match = imageRegex.exec(content)) !== null) {
      const imgPath = match[1].trim()
      if (imgPath) {
        resolveImagePath(dir, imgPath, addImageToCache)
      }
    }
  }, [])

  return { loadFiles, loadFileContent }
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
