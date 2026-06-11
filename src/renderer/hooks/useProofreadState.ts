import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { parseMdToBlocks } from '../lib/mdParser'

export function useProofreadState() {
  const {
    files, currentFileIndex, mdDir, proofreadState,
    markFileDone, setCurrentFileIndex, setCursorBlock,
    setBlocks, setRawLines, addImageToCache
  } = useAppStore()

  const completeCurrentAndNext = useCallback(async () => {
    const { files, currentFileIndex, mdDir, proofreadState } = useAppStore.getState()

    markFileDone(currentFileIndex)

    const newFiles = [...files]
    newFiles[currentFileIndex] = { ...newFiles[currentFileIndex], done: true }
    const stateToSave = { ...proofreadState, [newFiles[currentFileIndex].path]: true }
    await window.api.writeProofreadState(mdDir, stateToSave)

    const nextIndex = newFiles.findIndex((f, i) => i > currentFileIndex && !f.done)
    if (nextIndex !== -1) {
      setCurrentFileIndex(nextIndex)
      setCursorBlock(0)

      // Load next file content directly
      const result = await window.api.readFile(newFiles[nextIndex].path)
      if (result.success) {
        const lines = result.content.split('\n')
        setRawLines(lines)
        const blocks = parseMdToBlocks(result.content)
        setBlocks(blocks)

        // Resolve images
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
