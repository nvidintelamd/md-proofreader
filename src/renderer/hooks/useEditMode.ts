import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { parseMdToBlocks } from '../lib/mdParser'

export function useEditMode() {
  const {
    blocks, rawLines, editRange, mdDir, imageCache,
    setMode, setEditRange, setBlocks, setRawLines, addImageToCache
  } = useAppStore()

  const applyEdit = useCallback(async (newText: string) => {
    if (!editRange) return

    const { blocks, rawLines } = useAppStore.getState()
    const startLine = blocks[editRange.start].startLine
    const endLine = blocks[editRange.end].endLine

    const newLines = newText.split('\n')
    const before = rawLines.slice(0, startLine)
    const after = rawLines.slice(endLine + 1)
    const updatedRawLines = [...before, ...newLines, ...after]

    setRawLines(updatedRawLines)

    // Re-parse blocks
    const newBlocks = parseMdToBlocks(updatedRawLines.join('\n'))
    setBlocks(newBlocks)

    // Resolve any new images
    const imageRegex = /!\[.*?\]\((.*?)\)/g
    let match
    while ((match = imageRegex.exec(newText)) !== null) {
      const imgPath = match[1].trim()
      if (imgPath) {
        const cacheKey = `${mdDir}::${imgPath}`
        if (!imageCache.has(cacheKey)) {
          try {
            const result = await window.api.readImage(mdDir, imgPath)
            if (result.success && result.dataUrl) {
              addImageToCache(cacheKey, result.dataUrl)
            }
          } catch { /* ignore */ }
        }
      }
    }

    setMode('normal')
    setEditRange(null)
  }, [editRange, mdDir, imageCache])

  const cancelEdit = useCallback(() => {
    setMode('normal')
    setEditRange(null)
  }, [])

  return { applyEdit, cancelEdit }
}
