import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { parseMdToBlocks } from '../lib/mdParser'

export function useEditMode() {
  const {
    editRange, mdDir, imageCache,
    setMode, setEditRange, setBlocks, setRawLines, setCursorBlock, addImageToCache
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

    const newBlocks = parseMdToBlocks(updatedRawLines.join('\n'))
    setBlocks(newBlocks)

    // Reset cursor to safe position after re-parse
    const safeCursor = Math.min(editRange.start, newBlocks.length - 1)
    setCursorBlock(Math.max(0, safeCursor))
    setMode('normal')
    setEditRange(null)

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
  }, [editRange, mdDir, imageCache])

  const cancelEdit = useCallback(() => {
    setMode('normal')
    setEditRange(null)
  }, [])

  return { applyEdit, cancelEdit }
}
