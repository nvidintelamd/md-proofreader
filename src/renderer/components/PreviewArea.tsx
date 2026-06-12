import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import { renderMathString } from '../lib/katexSetup'

export function PreviewArea({ onOpenFiles }: { onOpenFiles?: () => void }) {
  const lines = useAppStore(s => s.lines)
  const cursorLine = useAppStore(s => s.cursorLine)
  const mode = useAppStore(s => s.mode)
  const editRange = useAppStore(s => s.editRange)
  const imageCache = useAppStore(s => s.imageCache)
  const mdDir = useAppStore(s => s.mdDir)
  const currentFileIndex = useAppStore(s => s.currentFileIndex)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleScroll = useCallback(() => {
    if (!containerRef.current || mode !== 'normal') return
    const container = containerRef.current
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

  const handleLineClick = useCallback((index: number) => {
    const state = useAppStore.getState()
    if (state.mode === 'normal') {
      state.setCursorLine(index)
    } else if (state.mode === 'edit_select' && state.editRange) {
      const start = Math.min(state.editRange.start, index)
      const end = Math.max(state.editRange.start, index)
      state.setEditRange({ start, end })
      state.setCursorLine(index)
      state.setMode('edit_modal')
    }
  }, [])

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
        const isCursor = idx === cursorLine
        const isInEditRange = editRange != null && idx >= editRange.start && idx <= editRange.end

        return (
          <div
            key={`${currentFileIndex}-${idx}`}
            data-line-index={idx}
            className={`flex items-start cursor-pointer transition-colors duration-50 ${
              isCursor ? 'bg-blue-100' : ''
            } ${isInEditRange && !isCursor ? 'bg-yellow-50' : ''} ${
              !isCursor && !isInEditRange ? 'hover:bg-gray-50' : ''
            }`}
            onClick={() => handleLineClick(idx)}
          >
            <span className="flex-shrink-0 w-12 text-right pr-2 text-[10px] text-gray-400 select-none py-0.5" style={{ marginTop: '2px' }}>
              {idx + 1}
            </span>
            <span className="flex-grow whitespace-pre-wrap break-all py-0.5 pr-4 min-h-[1.25rem]">
              <SafeLineContent
                line={line}
                lineIndex={idx}
                mathBlocks={mathBlocks}
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
  imageCache: Map<string, string>
  mdDir: string
}) {
  try {
    return <LineContent {...props} />
  } catch (err) {
    return <span className="text-red-400 text-xs">[渲染错误]</span>
  }
}

function LineContent({ line, lineIndex, mathBlocks, imageCache, mdDir }: {
  line: string
  lineIndex: number
  mathBlocks: { start: number; end: number }[]
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

  // Check for HTML table — render with LaTeX processing in cells
  if (line.includes('<table') || line.includes('<tr') || line.includes('<td') || line.includes('</table>')) {
    return <div dangerouslySetInnerHTML={{ __html: renderTableWithMath(line, imageCache, mdDir) }} />
  }

  // Split by inline images
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

  const hMatch = remaining.match(/^(#+)\s(.*)/)
  if (hMatch) {
    return (
      <span>
        <span className="text-indigo-600 font-bold mr-1">{hMatch[1]}</span>
        {parts}
        <span dangerouslySetInnerHTML={{ __html: renderTextSegment(hMatch[2]) }} />
      </span>
    )
  }

  if (parts.length > 0) {
    return <>{parts}<span dangerouslySetInnerHTML={{ __html: renderTextSegment(remaining) }} /></>
  }

  return <span dangerouslySetInnerHTML={{ __html: renderTextSegment(remaining) }} />
}

function renderTableWithMath(html: string, imageCache: Map<string, string>, mdDir: string): string {
  // Replace <img src="..."> with cached image URLs
  let result = html.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (match, src) => {
    const cacheKey = `${mdDir}::${src}`
    const cachedUrl = imageCache.get(cacheKey)
    if (cachedUrl) {
      return match.replace(src, cachedUrl)
    }
    return match
  })

  // Process table cells for LaTeX: replace $...$ and $$...$$ inside <td>...</td> and <th>...</th>
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
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  result = result.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')

  result = result.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_match, math) => {
    return renderMathString(math, false)
  })

  return result
}
