import { useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function useRegex() {
  const applyRegex = useCallback((preset: RegexPreset) => {
    const state = useAppStore.getState()
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = state

    // Determine range: selection or full file
    const start = editRange ? editRange.start : 0
    const end = editRange ? editRange.end : lines.length - 1

    // Push undo before modifying
    pushUndo({ lines: [...lines], range: { start, end } })

    // Apply regex to each line in range
    const newLines = [...lines]
    try {
      const re = new RegExp(preset.pattern, 'g')
      for (let i = start; i <= end; i++) {
        newLines[i] = newLines[i].replace(re, preset.replacement)
      }
    } catch (err) {
      console.error('Invalid regex:', err)
      return
    }

    setLines(newLines)
    setEditedRange({ start, end })
    setCursorLine(start)
    setEditRange(null)
  }, [])

  return { applyRegex }
}
