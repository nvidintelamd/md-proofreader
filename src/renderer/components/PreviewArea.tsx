import React, { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { renderMathInElement, renderMathString } from '../lib/katexSetup'

export function PreviewArea() {
  const {
    blocks, cursorBlock, mode, editRange, imageCache, mdDir
  } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      renderMathInElement(containerRef.current)
    }
  }, [blocks, cursorBlock])

  const handleScroll = useCallback(() => {
    if (!containerRef.current || mode !== 'normal') return
    const container = containerRef.current
    const blockElements = container.querySelectorAll('[data-block-index]')

    for (let i = 0; i < blockElements.length; i++) {
      const el = blockElements[i]
      const rect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      if (rect.top >= containerRect.top && rect.top < containerRect.bottom) {
        const idx = parseInt(el.getAttribute('data-block-index') || '0')
        useAppStore.getState().setCursorBlock(idx)
        break
      }
    }
  }, [mode])

  const handleBlockClick = useCallback((index: number) => {
    const state = useAppStore.getState()
    if (state.mode === 'normal') {
      state.setCursorBlock(index)
    } else if (state.mode === 'edit_select') {
      // First click already happened (set start), this is the second click (set end)
      if (state.editRange) {
        const start = Math.min(state.editRange.start, index)
        const end = Math.max(state.editRange.start, index)
        state.setEditRange({ start, end })
        state.setCursorBlock(index)
        // Immediately open modal
        state.setMode('edit_modal')
      }
    }
  }, [])

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        请从左侧选择文件
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-6 select-none"
      onScroll={handleScroll}
    >
      {/* Mode hint */}
      {mode === 'edit_select' && (
        <div className="sticky top-0 z-10 bg-yellow-100 text-yellow-800 text-xs text-center py-1 rounded mb-2">
          请点击结束行（起始行: {editRange ? editRange.start + 1 : '-'})
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {blocks.map((block, index) => {
          const isCursor = index === cursorBlock
          const isInEditRange = editRange &&
            index >= editRange.start && index <= editRange.end

          return (
            <div
              key={block.id}
              data-block-index={index}
              className={`
                relative group cursor-pointer
                transition-colors duration-100
                ${isCursor ? 'bg-blue-50 ring-2 ring-blue-400 rounded' : ''}
                ${isInEditRange && !isCursor ? 'bg-yellow-50 ring-1 ring-yellow-300 rounded' : ''}
                ${!isCursor && !isInEditRange ? 'hover:bg-gray-50' : ''}
              `}
              onClick={() => handleBlockClick(index)}
            >
              {/* Line number gutter */}
              <div className="absolute left-0 top-0 w-12 text-right pr-2 text-[10px] text-gray-400 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                {block.startLine + 1}
              </div>

              {/* Block content */}
              <div className="pl-14 pr-4 py-1">
                <BlockRenderer block={block} imageCache={imageCache} mdDir={mdDir} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BlockRenderer({ block, imageCache, mdDir }: {
  block: any
  imageCache: Map<string, string>
  mdDir: string
}) {
  const content = block.lines.join('\n')

  switch (block.type) {
    case 'heading': {
      const level = block.level || 1
      const text = content.replace(/^#{1,6}\s+/, '')
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold',
        2: 'text-xl font-bold',
        3: 'text-lg font-bold',
        4: 'text-base font-bold',
        5: 'text-sm font-bold',
        6: 'text-xs font-bold'
      }
      return (
        <div className="flex items-baseline gap-2">
          <span className="text-indigo-500 font-mono text-xs">
            {'#'.repeat(level)}
          </span>
          <span className={sizes[level] || sizes[1]}>
            {renderInlineContent(text, imageCache, mdDir)}
          </span>
        </div>
      )
    }

    case 'math': {
      // Extract math content between $$ markers
      const mathContent = content.replace(/^\$\$\s*\n?/, '').replace(/\n?\s*\$\$$/, '')
      return (
        <div className="my-2 p-2 bg-gray-50 rounded overflow-x-auto">
          <div dangerouslySetInnerHTML={{ __html: renderMathString(mathContent, true) }} />
        </div>
      )
    }

    case 'table':
      return (
        <div className="my-2 overflow-x-auto">
          <div dangerouslySetInnerHTML={{ __html: renderSimpleTable(content) }} />
        </div>
      )

    case 'image': {
      const imgMatch = content.match(/!\[.*?\]\((.*?)\)/)
      if (imgMatch) {
        const imgPath = imgMatch[1].trim()
        const cacheKey = `${mdDir}::${imgPath}`
        const src = imageCache.get(cacheKey) || imgPath
        return (
          <div className="my-2">
            <img
              src={src}
              alt=""
              className="max-w-xs max-h-48 rounded border border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )
      }
      return <div className="text-gray-400 italic">{content}</div>
    }

    case 'hr':
      return <hr className="my-4 border-gray-300" />

    case 'code':
      return (
        <pre className="my-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
          <code>{content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')}</code>
        </pre>
      )

    case 'paragraph':
    default:
      // Check if it's a list (lines starting with - or *)
      const isList = block.lines.some((l: string) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l))
      if (isList) {
        return (
          <div className="leading-relaxed">
            {block.lines.map((line: string, idx: number) => (
              <div key={idx} className="py-0.5">
                {renderInlineContent(line, imageCache, mdDir)}
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="leading-relaxed">
          {renderInlineContent(content, imageCache, mdDir)}
        </div>
      )
  }
}

function renderInlineContent(text: string, imageCache: Map<string, string>, mdDir: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0

  const imgRegex = /!\[.*?\]\((.*?)\)/g
  let match
  let lastIndex = 0

  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderBoldText(text.slice(lastIndex, match.index), key++))
    }

    const imgPath = match[1].trim()
    const cacheKey = `${mdDir}::${imgPath}`
    const src = imageCache.get(cacheKey) || imgPath

    parts.push(
      <img
        key={key++}
        src={src}
        alt=""
        className="inline-block max-h-16 rounded border border-gray-200 mx-1 align-middle"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(renderBoldText(text.slice(lastIndex), key++))
  }

  return parts.length > 0 ? <>{parts}</> : renderBoldText(text, 0)
}

function renderBoldText(text: string, key: number): React.ReactNode {
  const parts: React.ReactNode[] = []
  const boldRegex = /\*\*(.*?)\*\*/g
  let match
  let lastIndex = 0

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={`${key}-bold-${match.index}`} className="font-bold">
        {match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? <>{parts}</> : text
}

function renderSimpleTable(content: string): string {
  const lines = content.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return content

  const parseRow = (line: string) =>
    line.split('|').filter(cell => cell.trim()).map(cell => cell.trim())

  const headers = parseRow(lines[0])
  const bodyRows = lines.slice(2).map(parseRow)

  let html = '<table class="w-full border-collapse text-xs"><thead><tr>'
  headers.forEach(h => {
    html += `<th class="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold">${h}</th>`
  })
  html += '</tr></thead><tbody>'
  bodyRows.forEach(row => {
    html += '<tr>'
    row.forEach(cell => {
      html += `<td class="border border-gray-300 px-2 py-1">${cell}</td>`
    })
    html += '</tr>'
  })
  html += '</tbody></table>'
  return html
}
