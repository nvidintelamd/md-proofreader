import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useFileLoader() {
  const loadFiles = useCallback(async () => {
    const selectedFiles = await window.api.openFiles()
    if (selectedFiles.length === 0) return

    const dir = selectedFiles[0].path.replace(/[/\\][^/\\]+$/, '')
    const { setMdDir, setProofreadState, setFiles, setCurrentFileIndex, setCursorLine } = useAppStore.getState()

    setMdDir(dir)

    const state = await window.api.readProofreadState(dir)
    setProofreadState(state || {})

    const fileList = selectedFiles.map(f => ({
      name: f.name,
      path: f.path,
      done: state?.[f.path] === true
    }))
    setFiles(fileList)
    setCurrentFileIndex(0)
    setCursorLine(0)

    if (fileList.length > 0) {
      await loadFileContent(fileList[0].path, dir)
    }
  }, [])

  const loadFileContent = useCallback(async (filePath: string, mdDir?: string) => {
    const result = await window.api.readFile(filePath)
    if (!result.success || !result.content) return

    const { setLines, setCursorLine, addImageToCache } = useAppStore.getState()
    const lines = result.content.split('\n')
    setLines(lines)
    setCursorLine(0)

    const dir = mdDir || useAppStore.getState().mdDir

    // Extract images from markdown syntax ![](path)
    const mdImgRegex = /!\[.*?\]\((.*?)\)/g
    let match
    while ((match = mdImgRegex.exec(result.content)) !== null) {
      const imgPath = match[1].trim()
      if (imgPath) resolveImagePath(dir, imgPath, addImageToCache)
    }

    // Extract images from HTML <img src="path"> tags
    const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi
    while ((match = htmlImgRegex.exec(result.content)) !== null) {
      const imgPath = match[1].trim()
      if (imgPath && !imgPath.startsWith('http') && !imgPath.startsWith('data:')) {
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
