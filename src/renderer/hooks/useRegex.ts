import { useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function useRegex() {
  const applyRegex = useCallback((preset: RegexPreset) => {
    const state = useAppStore.getState()
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = state

    // Determine range: selection or full file
    const start = editRange ? editRange.start : 0
    let end = editRange ? editRange.end : lines.length - 1

    // Push undo before modifying
    pushUndo({ lines: [...lines], range: { start, end } })

    // Apply regex to each line in range
    // Convert literal \n in replacement to real newlines
    const realReplacement = preset.replacement.replace(/\\n/g, '\n')
    const newLines = [...lines]
    try {
      const re = new RegExp(preset.pattern, 'g')
      for (let i = start; i <= end; i++) {
        const result = newLines[i].replace(re, realReplacement)
        // If replacement contains newlines, split into multiple lines
        if (result.includes('\n')) {
          const splitLines = result.split('\n')
          newLines.splice(i, 1, ...splitLines)
          // Adjust end index for added lines
          end += splitLines.length - 1
        } else {
          newLines[i] = result
        }
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
