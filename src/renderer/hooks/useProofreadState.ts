import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useProofreadState() {
  const {
    files, currentFileIndex, mdDir, proofreadState,
    markFileDone, setCurrentFileIndex, setCursorBlock
  } = useAppStore()

  const completeCurrentAndNext = useCallback(async () => {
    const { files, currentFileIndex, mdDir, proofreadState } = useAppStore.getState()

    // Mark current file done
    markFileDone(currentFileIndex)

    // Save state to file
    const newFiles = [...files]
    newFiles[currentFileIndex] = { ...newFiles[currentFileIndex], done: true }
    const stateToSave = { ...proofreadState, [newFiles[currentFileIndex].path]: true }
    await window.api.writeProofreadState(mdDir, stateToSave)

    // Move to next unfinished file
    const nextIndex = newFiles.findIndex((f, i) => i > currentFileIndex && !f.done)
    if (nextIndex !== -1) {
      setCurrentFileIndex(nextIndex)
      setCursorBlock(0)

      // Load next file content
      const { loadFileContent } = await import('./useFileLoader').then(m => m.useFileLoader())
      await loadFileContent(newFiles[nextIndex].path)
    }
  }, [])

  const isAllDone = useCallback(() => {
    return files.every(f => f.done)
  }, [files])

  return { completeCurrentAndNext, isAllDone }
}
