import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import { renderMathString } from '../lib/katexSetup'

export function PreviewArea({ onOpenFiles }: { onOpenFiles?: () => void }) {
  const lines = useAppStore(s => s.lines)
  const cursorLine = useAppStore(s => s.cursorLine)
  const mode = useAppStore(s => s.mode)
  const editRange = useAppStore(s => s.editRange)
  const editedRange = useAppStore(s => s.editedRange)
  const imageCache = useAppStore(s => s.imageCache)
  const mdDir = useAppStore(s => s.mdDir)
  const currentFileIndex = useAppStore(s => s.currentFileIndex)
  const isDragging = useAppStore(s => s.isDragging)
  const dragStart = useAppStore(s => s.dragStart)
  const dragEnd = useAppStore(s => s.dragEnd)
  const containerRef = useRef<HTMLDivElement>(null)

  // Restore scroll position when file changes
  useEffect(() => {
    const state = useAppStore.getState()
    const filePath = state.files[state.currentFileIndex]?.path
    if (filePath && state.fileStates[filePath] && containerRef.current) {
      containerRef.current.scrollTop = state.fileStates[filePath].scrollTop
    }
  }, [currentFileIndex])

  useEffect(() => {
    const { cursorLine, setCursorLine } = useAppStore.getState()
    if (lines.length > 0 && cursorLine >= lines.length) {
      setCursorLine(lines.length - 1)
    }
  }, [lines.length])

  const mathBlocks = useMemo(() => {
    const blocks: { start: number; end: number }[] = []
    let mathStart = -1
    lines.forEach((l, i) => {
      if (l.trim() === '$$' && mathStart === -1) {
        mathStart = i
      } else if (l.trim() === '$$' && mathStart !== -1) {
        blocks.push({ start: mathStart, end: i })
        mathStart = -1
      }
    })
    return blocks
  }, [lines])

  // Detect MD table blocks (consecutive lines starting with |)
  const mdTableBlocks = useMemo(() => {
    const blocks: { start: number; end: number }[] = []
    let tableStart = -1
    lines.forEach((l, i) => {
      const trimmed = l.trim()
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (tableStart === -1) tableStart = i
      } else {
        if (tableStart !== -1) {
          blocks.push({ start: tableStart, end: i - 1 })
          tableStart = -1
        }
      }
    })
    if (tableStart !== -1) blocks.push({ start: tableStart, end: lines.length - 1 })
    return blocks
  }, [lines])

  // Detect HTML table continuation lines (lines between <table and </table> that aren't the first line)
  const isHtmlTableContinuation = useCallback((idx: number): boolean => {
    let tableStart = -1
    for (let i = 0; i <= idx; i++) {
      const t = lines[i]
      if (t.includes('<table')) {
        tableStart = i
      } else if (t.includes('</table>')) {
        if (i === idx) return false // This is the closing line, show it if it's the last
        if (tableStart !== -1 && idx > tableStart && idx < i) return true
        tableStart = -1
      }
    }
    return false
  }, [lines])

  // Find the full range for a table (MD or HTML) at a given line
  const findTableRange = useCallback((idx: number): { start: number; end: number } | null => {
    const mdBlock = mdTableBlocks.find(b => idx >= b.start && idx <= b.end)
    if (mdBlock) return mdBlock

    // Check HTML table
    let tableStart = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<table')) {
        tableStart = i
      } else if (lines[i].includes('</table>')) {
        if (tableStart !== -1 && idx >= tableStart && idx <= i) {
          return { start: tableStart, end: i }
        }
        tableStart = -1
      }
    }
    return null
  }, [lines, mdTableBlocks])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    // Save scroll position for current file
    useAppStore.getState().setScrollTop(container.scrollTop)

    if (mode !== 'normal') return
    const lineEls = container.querySelectorAll('[data-line-index]')
    const containerRect = container.getBoundingClientRect()

    for (let i = 0; i < lineEls.length; i++) {
      const el = lineEls[i] as HTMLElement
      const rect = el.getBoundingClientRect()
      if (rect.top >= containerRect.top && rect.top < containerRect.bottom) {
        const idx = parseInt(el.getAttribute('data-line-index') || '0')
        if (!isNaN(idx)) useAppStore.getState().setCursorLine(idx)
        break
      }
    }
  }, [mode])

  // Mouse interaction: click = select (blue), drag = multi-select (yellow)
  const mouseDownRef = useRef<{ idx: number; y: number; started: boolean } | null>(null)

  const handleMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return
    const state = useAppStore.getState()
    if (state.mode === 'edit_modal') return

    // In edit_select mode: click sets end and opens modal
    if (state.mode === 'edit_select' && state.editRange) {
      const start = Math.min(state.editRange.start, idx)
      const end = Math.max(state.editRange.start, idx)
      state.setEditRange({ start, end })
      state.setCursorLine(idx)
      state.setMode('edit_modal')
      return
    }

    // Normal mode: record mousedown for potential drag
    mouseDownRef.current = { idx, y: e.clientY, started: false }
    state.setCursorLine(idx)
    // DON'T clear editRange here — let dblclick set it first
  }, [])

  // Drag polling — runs while mouse is held down
  const lastMouseY = useRef<number>(0)
  const mouseHeld = useRef(false)

  useEffect(() => {
    const handleGlobalMouseDown = () => { mouseHeld.current = true }
    const handleGlobalMouseMove = (e: MouseEvent) => { lastMouseY.current = e.clientY }
    const handleGlobalMouseUp = () => {
      const state = useAppStore.getState()
      if (state.isDragging) state.endDrag()
      mouseHeld.current = false
      mouseDownRef.current = null
    }

    window.addEventListener('mousedown', handleGlobalMouseDown)
    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    let rafId: number
    const poll = () => {
      if (!mouseHeld.current) { rafId = requestAnimationFrame(poll); return }

      const state = useAppStore.getState()
      const container = containerRef.current
      if (!container) { rafId = requestAnimationFrame(poll); return }

      const containerRect = container.getBoundingClientRect()
      const mouseY = lastMouseY.current

      // Check if should start drag (> 5px from mousedown)
      if (mouseDownRef.current && !mouseDownRef.current.started) {
        const dy = Math.abs(mouseY - mouseDownRef.current.y)
        if (dy > 5) {
          mouseDownRef.current.started = true
          state.startDrag(mouseDownRef.current.idx)
        }
      }

      if (state.isDragging) {
        const lineEls = container.querySelectorAll('[data-line-index]')
        let found = false
        for (let i = 0; i < lineEls.length; i++) {
          const el = lineEls[i] as HTMLElement
          const rect = el.getBoundingClientRect()
          if (mouseY >= rect.top && mouseY < rect.bottom) {
            const idx = parseInt(el.getAttribute('data-line-index') || '0')
            if (!isNaN(idx)) state.updateDrag(idx)
            found = true
            break
          }
        }
        if (!found && mouseY < containerRect.top && lineEls.length > 0) {
          const idx = parseInt((lineEls[0] as HTMLElement).getAttribute('data-line-index') || '0')
          if (!isNaN(idx)) state.updateDrag(idx)
        }
        if (!found && mouseY > containerRect.bottom && lineEls.length > 0) {
          const last = lineEls.length - 1
          const idx = parseInt((lineEls[last] as HTMLElement).getAttribute('data-line-index') || '0')
          if (!isNaN(idx)) state.updateDrag(idx)
        }
        if (mouseY > containerRect.bottom - 20) container.scrollTop += 16
        else if (mouseY < containerRect.top + 20) container.scrollTop -= 16
      }

      rafId = requestAnimationFrame(poll)
    }
    rafId = requestAnimationFrame(poll)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousedown', handleGlobalMouseDown)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const state = useAppStore.getState()
    if (state.isDragging) {
      state.endDrag()
    }
  }, [])

  // Compute visual selection range (drag or editRange)
  const visualRange = useMemo(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      return { start: Math.min(dragStart, dragEnd), end: Math.max(dragStart, dragEnd) }
    }
    return editRange
  }, [isDragging, dragStart, dragEnd, editRange])

  if (lines.length === 0) {
    return <WelcomePage onOpenFiles={onOpenFiles} />
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto select-none"
      onScroll={handleScroll}
    >
      {mode === 'edit_select' && (
        <div className="sticky top-0 z-10 bg-yellow-100 text-yellow-800 text-xs text-center py-1">
          请点击结束行（起始行: {editRange ? editRange.start + 1 : '-'})
        </div>
      )}

      {lines.map((line, idx) => {
        // Skip hidden lines (MD table rows after first, HTML table rows after first)
        const isMdTableHidden = mdTableBlocks.some(b => idx > b.start && idx <= b.end)
        const isHtmlTableHidden = isHtmlTableContinuation(idx)
        if (isMdTableHidden || isHtmlTableHidden) return null

        const isCursor = idx === cursorLine
        const isSelected = visualRange != null && idx >= visualRange.start && idx <= visualRange.end
        const isEdited = editedRange != null && idx >= editedRange.start && idx <= editedRange.end

        let bgClass = ''
        if (isEdited && !isSelected) bgClass = 'bg-purple-100 hover:bg-purple-200'
        if (isSelected) bgClass = 'bg-yellow-200 hover:bg-yellow-200'
        if (isCursor && !isSelected) bgClass = 'bg-blue-100 hover:bg-blue-200'
        if (!isSelected && !isCursor && !isEdited) bgClass = 'hover:bg-gray-50'

        return (
          <div
            key={`${currentFileIndex}-${idx}`}
            data-line-index={idx}
            className={`flex items-start cursor-pointer transition-colors duration-50 ${bgClass}`}
            onMouseDown={(e) => handleMouseDown(idx, e)}
            onDoubleClick={() => {
              const state = useAppStore.getState()
              // If clicking on a table, open full table range
              const tableRange = findTableRange(idx)
              if (tableRange) {
                state.setEditRange(tableRange)
              } else {
                state.setEditRange({ start: idx, end: idx })
              }
              state.setCursorLine(idx)
              state.setMode('edit_modal')
            }}
          >
            <span className="flex-shrink-0 w-12 text-right pr-2 text-[10px] text-gray-400 select-none py-0.5" style={{ marginTop: '2px' }}>
              {idx + 1}
            </span>
            <span className="flex-grow whitespace-pre-wrap break-all py-0.5 pr-4 min-h-[1.25rem]">
              <SafeLineContent
                line={line}
                lineIndex={idx}
                mathBlocks={mathBlocks}
                mdTableBlocks={mdTableBlocks}
                imageCache={imageCache}
                mdDir={mdDir}
              />
            </span>
          </div>
        )
      })}
    </div>
  )
}

function WelcomePage({ onOpenFiles }: { onOpenFiles?: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 select-none">
      <div className="text-6xl mb-6 opacity-30">📝</div>
      <h2 className="text-xl font-semibold text-gray-500 mb-2">MD校对工具</h2>
      <p className="text-sm text-gray-400 mb-6">打开 Markdown 文件开始校对</p>
      <button
        onClick={onOpenFiles}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        打开MD文件
      </button>
      <div className="mt-8 text-xs text-gray-300 space-y-1 text-center">
        <p>hjkl 移动 | v 选择编辑 | PgUp/PgDn 翻页</p>
      </div>
    </div>
  )
}

function SafeLineContent(props: {
  line: string
  lineIndex: number
  mathBlocks: { start: number; end: number }[]
  mdTableBlocks: { start: number; end: number }[]
  imageCache: Map<string, string>
  mdDir: string
}) {
  try {
    return <LineContent {...props} />
  } catch (err) {
    return <span className="text-red-400 text-xs">[渲染错误]</span>
  }
}

function LineContent({ line, lineIndex, mathBlocks, mdTableBlocks, imageCache, mdDir }: {
  line: string
  lineIndex: number
  mathBlocks: { start: number; end: number }[]
  mdTableBlocks: { start: number; end: number }[]
  imageCache: Map<string, string>
  mdDir: string
}) {
  const mathBlock = mathBlocks.find(b => lineIndex >= b.start && lineIndex <= b.end)
  if (mathBlock) {
    if (lineIndex === mathBlock.start || lineIndex === mathBlock.end) {
      return <span className="opacity-0">$$</span>
    }
    return (
      <div
        className="my-1"
        dangerouslySetInnerHTML={{ __html: renderMathString(line.trim(), true) }}
      />
    )
  }

  // MD table block rendering
  const mdTableBlock = mdTableBlocks.find(b => lineIndex >= b.start && lineIndex <= b.end)
  if (mdTableBlock) {
    // Only render on first line of the block
    if (lineIndex === mdTableBlock.start) {
      return <MdTableRenderer startLine={mdTableBlock.start} endLine={mdTableBlock.end} imageCache={imageCache} mdDir={mdDir} />
    }
    // Skip other lines (already rendered)
    return null
  }

  // HTML table
  if (line.includes('<table') || line.includes('<tr') || line.includes('<td') || line.includes('</table>')) {
    return <div dangerouslySetInnerHTML={{ __html: renderTableWithMath(line, imageCache, mdDir) }} />
  }

  const imgRegex = /!\[.*?\]\((.*?)\)/g
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let match
  let key = 0

  while ((match = imgRegex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      const textSeg = line.substring(lastIdx, match.index)
      parts.push(<span key={`t${key++}`} dangerouslySetInnerHTML={{ __html: renderTextSegment(textSeg) }} />)
    }
    const rawPath = match[1].trim()
    const cacheKey = `${mdDir}::${rawPath}`
    const imgUrl = imageCache.get(cacheKey) || rawPath
    parts.push(
      <img
        key={`i${key++}`}
        src={imgUrl}
        alt=""
        className="inline-block max-w-[200px] max-h-[200px] my-1 border border-gray-200 rounded bg-gray-50 align-middle"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
    lastIdx = match.index + match[0].length
  }

  const remaining = line.substring(lastIdx)

  // HR --- or *** or ___
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(remaining.trim())) {
    return (
      <div className="my-3 flex items-center justify-center">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>
    )
  }

  // Unordered list - item or * item
  const listMatch = remaining.match(/^(\s*)([-*+])\s(.*)/)
  if (listMatch) {
    const indent = listMatch[1].length
    const level = Math.floor(indent / 2)
    const content = listMatch[3]
    return (
      <div
        className="flex items-center gap-1.5 my-0.5"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
        <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: renderTextSegment(content) }} />
      </div>
    )
  }

  // Ordered list 1. item
  const olMatch = remaining.match(/^(\s*)(\d+)\.\s(.*)/)
  if (olMatch) {
    const indent = olMatch[1].length
    const level = Math.floor(indent / 2)
    const num = olMatch[2]
    const content = olMatch[3]
    return (
      <div
        className="flex items-center gap-1.5 my-0.5"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <span className="text-gray-500 text-xs font-mono flex-shrink-0 mt-0.5 min-w-[1rem] text-right">{num}.</span>
        <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: renderTextSegment(content) }} />
      </div>
    )
  }

  // Blockquote > text
  const bqMatch = remaining.match(/^(>+)\s?(.*)/)
  if (bqMatch) {
    const depth = bqMatch[1].length
    return (
      <div
        className="border-l-2 border-gray-400 pl-3 text-gray-600 italic my-0.5"
        style={{ marginLeft: `${(depth - 1) * 12}px` }}
        dangerouslySetInnerHTML={{ __html: renderTextSegment(bqMatch[2]) }}
      />
    )
  }

  // Heading H1-H6
  const hMatch = remaining.match(/^(#{1,6})\s(.*)/)
  if (hMatch) {
    const level = hMatch[1].length
    const sizes: Record<number, string> = {
      1: 'text-2xl font-bold', 2: 'text-xl font-bold', 3: 'text-lg font-bold',
      4: 'text-base font-bold', 5: 'text-sm font-bold', 6: 'text-xs font-bold'
    }
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-indigo-500 font-mono text-xs">{'#'.repeat(level)}</span>
        <span className={sizes[level] || sizes[1]}>
          {parts}
          <span dangerouslySetInnerHTML={{ __html: renderTextSegment(hMatch[2]) }} />
        </span>
      </div>
    )
  }

  if (parts.length > 0) {
    return <>{parts}<span dangerouslySetInnerHTML={{ __html: renderTextSegment(remaining) }} /></>
  }

  return <span dangerouslySetInnerHTML={{ __html: renderTextSegment(remaining) }} />
}

function TableCellStyle({ cell, imageCache, mdDir }: {
  cell: string
  imageCache: Map<string, string>
  mdDir: string
}) {
  // Split by image syntax and render inline
  const imgRegex = /!\[.*?\]\((.*?)\)/g
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let match
  let key = 0

  while ((match = imgRegex.exec(cell)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<span key={`t${key++}`} dangerouslySetInnerHTML={{ __html: renderTextSegment(cell.substring(lastIdx, match.index)) }} />)
    }
    const imgPath = match[1].trim()
    const cacheKey = `${mdDir}::${imgPath}`
    const src = imageCache.get(cacheKey) || imgPath
    parts.push(
      <img key={`i${key++}`} src={src} alt="" className="inline-block max-w-[120px] max-h-[60px] rounded border border-gray-200 align-middle"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
    )
    lastIdx = match.index + match[0].length
  }

  if (parts.length > 0) {
    return <>{parts}{lastIdx < cell.length && <span dangerouslySetInnerHTML={{ __html: renderTextSegment(cell.slice(lastIdx)) }} />}</>
  }
  return <span dangerouslySetInnerHTML={{ __html: renderTextSegment(cell) }} />
}

function MdTableRenderer({ startLine, endLine, imageCache, mdDir }: {
  startLine: number
  endLine: number
  imageCache: Map<string, string>
  mdDir: string
}) {
  const lines = useAppStore(s => s.lines)
  const tableLines = lines.slice(startLine, endLine + 1)

  // Parse table rows, skip separator lines
  const rows: string[][] = []
  for (const line of tableLines) {
    const trimmed = line.trim()
    // Skip separator rows (| --- | --- |)
    if (/^\|[\s\-:]+(\|[\s\-:]+)*\|$/.test(trimmed)) continue
    const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1)
    if (cells.length > 0) rows.push(cells.map(c => c.trim()))
  }

  if (rows.length === 0) return null

  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {rows[0].map((cell, i) => (
              <th key={i} className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
            {rows.slice(1).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-300 px-2 py-1">
                    <TableCellStyle cell={cell} imageCache={imageCache} mdDir={mdDir} />
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

function renderTableWithMath(html: string, imageCache: Map<string, string>, mdDir: string): string {
  let result = html.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (match, src) => {
    const cacheKey = `${mdDir}::${src}`
    const cachedUrl = imageCache.get(cacheKey)
    if (cachedUrl) return match.replace(src, cachedUrl)
    return match
  })

  result = result.replace(/(<t[dh][^>]*>)([\s\S]*?)(<\/t[dh]>)/g, (_match, openTag, content, closeTag) => {
    const processed = content
      .replace(/\$\$([\s\S]*?)\$\$/g, (_m: string, math: string) => renderMathString(math.trim(), true))
      .replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_m: string, math: string) => renderMathString(math.trim(), false))
    return openTag + processed + closeTag
  })

  return result
}

function renderTextSegment(text: string): string {
  if (!text) return ''

  const mathParts: string[] = []
  let remaining = text

  remaining = remaining.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    const placeholder = `__MATH_BLOCK_${mathParts.length}__`
    mathParts.push(renderMathString(math.trim(), true))
    return placeholder
  })
  remaining = remaining.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, math) => {
    const placeholder = `__MATH_INLINE_${mathParts.length}__`
    mathParts.push(renderMathString(math.trim(), false))
    return placeholder
  })

  let result = remaining
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Inline code `code`
  result = result.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-sm font-mono border border-red-200">$1</code>')
  // Bold italic ***text***
  result = result.replace(/\*\*\*(.*?)\*\*\*/g, '<span class="font-bold italic">$1</span>')
  // Bold **text**
  result = result.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
  // Italic *text*
  result = result.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<span class="italic">$1</span>')
  // Strikethrough ~~text~~
  result = result.replace(/~~(.*?)~~/g, '<span class="line-through text-gray-500">$1</span>')
  // Highlight ==text==
  result = result.replace(/==(.*?)==/g, '<span class="bg-yellow-200 px-0.5 rounded">$1</span>')
  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')

  mathParts.forEach((html, i) => {
    result = result.replace(`__MATH_BLOCK_${i}__`, html)
    result = result.replace(`__MATH_INLINE_${i}__`, html)
  })

  return result
}
