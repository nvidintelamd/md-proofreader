import { useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function useRegex() {
  const applyRegex = useCallback((preset: RegexPreset) => {
    const state = useAppStore.getState()
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = state

    const start = editRange ? editRange.start : 0
    let end = editRange ? editRange.end : lines.length - 1

    // Validate regex first
    let re: RegExp
    try {
      re = new RegExp(preset.pattern, 'g')
    } catch {
      alert('正则表达式语法错误: ' + preset.pattern)
      return
    }

    // Convert literal \n in replacement to real newline
    const realReplacement = preset.replacement.replace(/\\n/g, '\n')

    // Count matches first
    let matchCount = 0
    for (let i = start; i <= end; i++) {
      re.lastIndex = 0
      if (re.test(lines[i])) matchCount++
    }

    if (matchCount === 0) {
      alert(`正则 "${preset.name}" 未匹配到任何内容`)
      return
    }

    // Push undo
    pushUndo({ lines: [...lines], range: { start, end } })

    // Apply
    const newLines = [...lines]
    try {
      for (let i = start; i <= end; i++) {
        const result = newLines[i].replace(new RegExp(preset.pattern, 'g'), realReplacement)
        if (result.includes('\n')) {
          const splitLines = result.split('\n')
          newLines.splice(i, 1, ...splitLines)
          end += splitLines.length - 1
        } else {
          newLines[i] = result
        }
      }
    } catch (err) {
      alert('正则执行错误: ' + err)
      return
    }

    setLines(newLines)
    setEditedRange({ start, end })
    setCursorLine(start)
    setEditRange(null)
  }, [])

  return { applyRegex }
}
