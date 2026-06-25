import React, { useState, useRef, useEffect } from 'react'
import { useAppStore, type SurroundPreset } from '../store/appStore'

interface Props {
  onSave: (text: string) => void
  onCancel: () => void
}

export function EditModal({ onSave, onCancel }: Props) {
  const editRange = useAppStore(s => s.editRange)
  const mdDir = useAppStore(s => s.mdDir)
  const surroundPresets = useAppStore(s => s.surroundPresets)
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Surround manager state
  const [sp, setSp] = useState('')
  const [ss, setSs] = useState('')
  const [editingSurroundId, setEditingSurroundId] = useState<string | null>(null)
  const [showSurroundManager, setShowSurroundManager] = useState(false)

  // Initialize and focus on every mount
  useEffect(() => {
    const { lines, editRange } = useAppStore.getState()
    if (editRange) {
      const selectedLines = lines.slice(editRange.start, editRange.end + 1)
      let content = selectedLines.join('\n')
      content = beautifyHtmlTables(content)
      setText(content)
    }
    const focus = () => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      } else {
        requestAnimationFrame(focus)
      }
    }
    focus()
  }, [])

  const handleSave = () => {
    onSave(compressHtmlTables(text))
  }

  const handleSurround = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return // No selection
    const selected = text.substring(start, end)
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)
    setText(newText)
    setTimeout(() => {
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
      textarea.focus()
    }, 0)
  }

  const handleSaveSurround = () => {
    if (!sp && !ss) return
    if (editingSurroundId) {
      useAppStore.getState().updateSurroundPreset(editingSurroundId, { prefix: sp, suffix: ss, name: sp.slice(0, 4) || ss.slice(0, 4) || '套用' })
    } else {
      const name = (sp + ss).slice(0, 4) || '套用'
      useAppStore.getState().addSurroundPreset({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, prefix: sp, suffix: ss
      })
    }
    setSp('')
    setSs('')
    setEditingSurroundId(null)
  }

  const handleEditSurround = (p: SurroundPreset) => {
    setEditingSurroundId(p.id)
    setSp(p.prefix)
    setSs(p.suffix)
  }

  const handleDeleteSurround = (id: string) => {
    useAppStore.getState().deleteSurroundPreset(id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
    // Tab: indent 2 spaces (or shift+tab: dedent)
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const isMultiLine = text.substring(start, end).includes('\n') || start !== end

      if (e.shiftKey) {
        // Shift+Tab: dedent
        const allLines = text.split('\n')
        const beforeCursor = text.slice(0, start)
        const afterCursor = text.slice(end)
        const startLineIdx = beforeCursor.split('\n').length - 1
        const endLineIdx = (start === end ? startLineIdx : beforeCursor.split('\n').length + text.substring(start, end).split('\n').length - 2)

        let removedBefore = 0
        for (let i = startLineIdx; i <= endLineIdx && i < allLines.length; i++) {
          if (allLines[i].startsWith('  ')) {
            allLines[i] = allLines[i].substring(2)
            if (i === startLineIdx) removedBefore = 2
          } else if (allLines[i].startsWith(' ')) {
            allLines[i] = allLines[i].substring(1)
            if (i === startLineIdx) removedBefore = 1
          }
        }
        const newText = allLines.join('\n')
        setText(newText)
        setTimeout(() => {
          textarea.setSelectionRange(Math.max(0, start - removedBefore), Math.max(0, end - removedBefore))
        }, 0)
      } else {
        // Tab: indent 2 spaces
        if (start === end) {
          // No selection: insert 2 spaces
          const newText = text.slice(0, start) + '  ' + text.slice(end)
          setText(newText)
          setTimeout(() => textarea.setSelectionRange(start + 2, start + 2), 0)
        } else {
          // Selection: indent all selected lines
          const allLines = text.split('\n')
          const beforeCursor = text.slice(0, start)
          const startLineIdx = beforeCursor.split('\n').length - 1
          const selectedText = text.substring(start, end)
          const endLineIdx = startLineIdx + selectedText.split('\n').length - 1

          let added = 0
          for (let i = startLineIdx; i <= endLineIdx && i < allLines.length; i++) {
            allLines[i] = '  ' + allLines[i]
            added += 2
          }
          const newText = allLines.join('\n')
          setText(newText)
          setTimeout(() => textarea.setSelectionRange(start + 2, end + added), 0)
        }
      }
    }
  }

  const handleBackspace = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Backspace') return

    const textarea = e.currentTarget
    const cursorPos = textarea.selectionStart
    const beforeCursor = text.slice(0, cursorPos)

    const currentLine = beforeCursor.split('\n').pop() || ''
    const imgMatch = currentLine.match(/!\[.*?\]\((.*?)\)$/)

    if (imgMatch) {
      e.preventDefault()
      const newLine = currentLine.slice(0, currentLine.lastIndexOf('![]'))
      const allLines = text.split('\n')
      const lineIdx = beforeCursor.split('\n').length - 1
      allLines[lineIdx] = newLine
      const newText = allLines.join('\n')
      setText(newText)

      setTimeout(() => {
        const newPos = beforeCursor.length - (currentLine.length - newLine.length)
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-2xl w-[800px] max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-700">
            编辑选区
            {editRange && (
              <span className="text-xs text-gray-400 ml-2">
                行 {editRange.start + 1}-{editRange.end + 1}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> 取消
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl+S</kbd> 保存
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {/* Surround manager */}
          <div className="mb-2">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowSurroundManager(!showSurroundManager)}
                className="px-2 py-0.5 text-[10px] rounded bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold">
                +
              </button>
              {showSurroundManager && (
                <div className="flex items-center gap-1.5 flex-1">
                  <input value={sp} onChange={(e) => setSp(e.target.value)}
                    className="w-28 px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="前插入内容" />
                  <input value={ss} onChange={(e) => setSs(e.target.value)}
                    className="w-28 px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="后插入内容" />
                  <button onClick={handleSaveSurround}
                    className="px-2 py-0.5 text-[10px] rounded bg-blue-600 hover:bg-blue-700 text-white">
                    {editingSurroundId ? '更新' : '保存'}
                  </button>
                  {editingSurroundId && (
                    <button onClick={() => { setEditingSurroundId(null); setSp(''); setSs('') }}
                      className="px-2 py-0.5 text-[10px] rounded bg-gray-400 hover:bg-gray-500 text-white">取消</button>
                  )}
                </div>
              )}
            </div>
            {/* Saved surround buttons */}
            {surroundPresets.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {surroundPresets.map(p => (
                  <button key={p.id}
                    onClick={() => handleSurround(p.prefix, p.suffix)}
                    onContextMenu={(e) => { e.preventDefault(); handleEditSurround(p) }}
                    title={`前: ${p.prefix || '(空)'}\n后: ${p.suffix || '(空)'}\n右键编辑`}
                    className="px-2 py-0.5 text-[10px] rounded bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300">
                    {p.name}
                    {editingSurroundId === p.id && (
                      <span onClick={(e) => { e.stopPropagation(); handleDeleteSurround(p.id) }}
                        className="ml-1 text-red-500 hover:text-red-700">×</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            autoFocus
            tabIndex={0}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              handleKeyDown(e)
              handleBackspace(e)
            }}
            className="w-full h-full min-h-[300px] p-3 text-sm font-mono leading-relaxed border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="编辑内容..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function beautifyHtmlTables(text: string): string {
  if (!text.includes('<table') && !text.includes('<tr')) return text

  return text.replace(/(<table[^>]*>)([\s\S]*?)(<\/table>)/gi, (_match, openTag, inner, closeTag) => {
    let result = openTag + '\n'
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      result += '  <tr>\n'
      const cellRegex = /(<t[dh][^>]*>)([\s\S]*?)(<\/t[dh]>)/gi
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellContent = cellMatch[2].replace(/\s+/g, ' ').trim()
        result += `    ${cellMatch[1]}${cellContent}${cellMatch[3]}\n`
      }
      result += '  </tr>\n'
    }
    result += closeTag
    return result
  })
}

function compressHtmlTables(text: string): string {
  if (!text.includes('<table')) return text

  return text.replace(/(<table[^>]*>)([\s\S]*?)(<\/table>)/gi, (_match, openTag, inner, closeTag) => {
    // Collapse all whitespace/newlines into a single space between tags
    const compressed = inner
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim()
    return openTag + compressed + closeTag
  })
}
