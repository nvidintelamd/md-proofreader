import { useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

function applySingleRegex(pattern: string, replacement: string, lines: string[], start: number, end: number): { lines: string[]; end: number; changed: boolean } {
  const re = new RegExp(pattern, 'gms')
  const realReplace = replacement.replace(/\\n/g, '\n')
  const newLines = [...lines]
  let changed = false
  let currentEnd = end

  for (let i = start; i <= currentEnd; i++) {
    const result = newLines[i].replace(new RegExp(re.source, 'gms'), realReplace)
    if (result !== newLines[i]) {
      changed = true
      if (result.includes('\n')) {
        const splitLines = result.split('\n')
        newLines.splice(i, 1, ...splitLines)
        currentEnd += splitLines.length - 1
        i += splitLines.length - 1
      } else {
        newLines[i] = result
      }
    }
  }

  return { lines: newLines, end: currentEnd, changed }
}

export function useRegex() {
  const applyRegex = useCallback((preset: RegexPreset) => {
    const state = useAppStore.getState()
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = state

    const start = editRange ? editRange.start : 0
    const rangeEnd = editRange ? editRange.end : lines.length - 1

    // Check if this is a packed group
    if (preset.pattern === '__GROUP__') {
      const pairs = preset.replacement.split(';;;').map(p => {
        const [pattern, replacement] = p.split('|||')
        return { pattern, replacement: replacement || '' }
      })

      // Count total matches
      let totalMatches = 0
      for (const { pattern } of pairs) {
        try {
          const re = new RegExp(pattern, 'gms')
          for (let i = start; i <= rangeEnd; i++) {
            re.lastIndex = 0
            if (re.test(lines[i])) totalMatches++
          }
        } catch { /* skip invalid */ }
      }
      if (totalMatches === 0) { alert(`按钮组 "${preset.name}" 未匹配到任何内容`); return }

      // Apply all rules in sequence
      pushUndo({ lines: [...lines], range: { start, end: rangeEnd } })
      let currentLines = [...lines]
      let currentEnd = rangeEnd
      let firstChanged = -1
      let lastChanged = -1

      for (const { pattern, replacement } of pairs) {
        if (!pattern) continue
        try {
          const result = applySingleRegex(pattern, replacement, currentLines, start, currentEnd)
          if (result.changed) {
            if (firstChanged === -1) firstChanged = start
            lastChanged = result.end
            currentLines = result.lines
            currentEnd = result.end
          }
        } catch { /* skip invalid */ }
      }

      setLines(currentLines)
      if (firstChanged !== -1) {
        setEditedRange({ start: firstChanged, end: lastChanged })
        setCursorLine(firstChanged)
      }
      setEditRange(null)
      return
    }

    // Single regex
    let re: RegExp
    try {
      re = new RegExp(preset.pattern, 'gms')
    } catch {
      alert('正则表达式语法错误: ' + preset.pattern)
      return
    }

    const realReplacement = preset.replacement.replace(/\\n/g, '\n')

    let matchCount = 0
    for (let i = start; i <= rangeEnd; i++) {
      re.lastIndex = 0
      if (re.test(lines[i])) matchCount++
    }
    if (matchCount === 0) { alert(`正则 "${preset.name}" 未匹配到任何内容`); return }

    pushUndo({ lines: [...lines], range: { start, end: rangeEnd } })

    const result = applySingleRegex(preset.pattern, preset.replacement, lines, start, rangeEnd)
    setLines(result.lines)
    if (result.changed) {
      setEditedRange({ start, end: result.end })
      setCursorLine(start)
    }
    setEditRange(null)
  }, [])

  return { applyRegex }
}
