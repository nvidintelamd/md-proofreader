import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { textToLines } from '../lib/textUtils'

export function useEditMode() {
  const editRange = useAppStore(s => s.editRange)
  const mdDir = useAppStore(s => s.mdDir)
  const imageCache = useAppStore(s => s.imageCache)

  const applyEdit = useCallback(async (newText: string) => {
    if (!editRange) return

    const { lines, setLines, setCursorLine, setMode, setEditRange, addImageToCache, pushUndo, setEditedRange } = useAppStore.getState()

    pushUndo({ lines: [...lines], range: editRange })

    const newLines = textToLines(newText)
    const before = lines.slice(0, editRange.start)
    const after = lines.slice(editRange.end + 1)
    const updatedLines = [...before, ...newLines, ...after]

    setLines(updatedLines)
    setEditedRange({ start: editRange.start, end: editRange.start + newLines.length - 1 })

    const safeCursor = Math.min(editRange.start, updatedLines.length - 1)
    setCursorLine(Math.max(0, safeCursor))
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
    useAppStore.getState().setMode('normal')
    useAppStore.getState().setEditRange(null)
  }, [])

  return { applyEdit, cancelEdit }
}
