import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { loadFileContent } from './useFileLoader'

export function useProofreadState() {
  const files = useAppStore(s => s.files)

  const completeCurrentAndNext = useCallback(async () => {
    const state = useAppStore.getState()
    const { files, currentFileIndex, lines, markFileDoneLocal, setCurrentFileIndex, setCursorLine } = state

    const filePath = files[currentFileIndex].path

    // Save current content back to the MD file
    const content = lines.join('\n')
    const writeResult = await window.api.writeFile(filePath, content)
    if (!writeResult.success) {
      console.error('Failed to save file:', writeResult.error)
      return
    }

    // Mark done in local state
    markFileDoneLocal(currentFileIndex)

    // Persist to session file
    await window.api.markDone(filePath)

    // Move to next unfinished
    const newFiles = [...files]
    newFiles[currentFileIndex] = { ...newFiles[currentFileIndex], done: true }
    const nextIndex = newFiles.findIndex((f, i) => i > currentFileIndex && !f.done)
    if (nextIndex !== -1) {
      setCurrentFileIndex(nextIndex)
      setCursorLine(0)
      await loadFileContent(newFiles[nextIndex].path)
    }
  }, [])

  const isAllDone = useCallback(() => {
    return files.every(f => f.done)
  }, [files])

  return { completeCurrentAndNext, isAllDone }
}
