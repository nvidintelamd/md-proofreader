import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useProofreadState() {
  const files = useAppStore(s => s.files)

  const completeCurrentAndNext = useCallback(async () => {
    const state = useAppStore.getState()
    const { files, currentFileIndex, mdDir, proofreadState, markFileDone, setCurrentFileIndex, setCursorLine, setLines, addImageToCache } = state

    markFileDone(currentFileIndex)

    const newFiles = [...files]
    newFiles[currentFileIndex] = { ...newFiles[currentFileIndex], done: true }
    const stateToSave = { ...proofreadState, [newFiles[currentFileIndex].path]: true }
    await window.api.writeProofreadState(mdDir, stateToSave)

    const nextIndex = newFiles.findIndex((f, i) => i > currentFileIndex && !f.done)
    if (nextIndex !== -1) {
      setCurrentFileIndex(nextIndex)
      setCursorLine(0)

      const result = await window.api.readFile(newFiles[nextIndex].path)
      if (result.success && result.content) {
        const lines = result.content.split('\n')
        setLines(lines)

        const imageRegex = /!\[.*?\]\((.*?)\)/g
        let match
        while ((match = imageRegex.exec(result.content)) !== null) {
          const imgPath = match[1].trim()
          if (imgPath) {
            const cacheKey = `${mdDir}::${imgPath}`
            try {
              const imgResult = await window.api.readImage(mdDir, imgPath)
              if (imgResult.success && imgResult.dataUrl) {
                addImageToCache(cacheKey, imgResult.dataUrl)
              }
            } catch { /* ignore */ }
          }
        }
      }
    }
  }, [])

  const isAllDone = useCallback(() => {
    return files.every(f => f.done)
  }, [files])

  return { completeCurrentAndNext, isAllDone }
}
