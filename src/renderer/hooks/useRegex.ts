import { useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function useRegex() {
  const applyRegex = useCallback((preset: RegexPreset) => {
    const state = useAppStore.getState()
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = state

    const rangeStart = editRange ? editRange.start : 0
    let rangeEnd = editRange ? editRange.end : lines.length - 1

    let re: RegExp
    try {
      re = new RegExp(preset.pattern, 'g')
    } catch {
      alert('正则表达式语法错误: ' + preset.pattern)
      return
    }

    const realReplacement = preset.replacement.replace(/\\n/g, '\n')

    // Count matches
    let matchCount = 0
    for (let i = rangeStart; i <= rangeEnd; i++) {
      re.lastIndex = 0
      if (re.test(lines[i])) matchCount++
    }

    if (matchCount === 0) {
      alert(`正则 "${preset.name}" 未匹配到任何内容`)
      return
    }

    pushUndo({ lines: [...lines], range: { start: rangeStart, end: rangeEnd } })

    // Track which lines actually changed
    let firstChanged = -1
    let lastChanged = -1
    const newLines = [...lines]

    try {
      for (let i = rangeStart; i <= rangeEnd; i++) {
        const original = newLines[i]
        const result = original.replace(new RegExp(preset.pattern, 'g'), realReplacement)
        if (result !== original) {
          if (firstChanged === -1) firstChanged = i
          lastChanged = i
          if (result.includes('\n')) {
            const splitLines = result.split('\n')
            newLines.splice(i, 1, ...splitLines)
            rangeEnd += splitLines.length - 1
            lastChanged = i + splitLines.length - 1
          } else {
            newLines[i] = result
          }
        }
      }
    } catch (err) {
      alert('正则执行错误: ' + err)
      return
    }

    setLines(newLines)
    // Only highlight lines that actually changed
    if (firstChanged !== -1) {
      setEditedRange({ start: firstChanged, end: lastChanged })
      setCursorLine(firstChanged)
    }
    setEditRange(null)
  }, [])

  return { applyRegex }
}
