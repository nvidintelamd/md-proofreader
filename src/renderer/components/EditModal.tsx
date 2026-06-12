import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  onSave: (text: string) => void
  onCancel: () => void
}

export function EditModal({ onSave, onCancel }: Props) {
  const lines = useAppStore(s => s.lines)
  const editRange = useAppStore(s => s.editRange)
  const imageCache = useAppStore(s => s.imageCache)
  const mdDir = useAppStore(s => s.mdDir)
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editRange) {
      const selectedLines = lines.slice(editRange.start, editRange.end + 1)
      setText(selectedLines.join('\n'))
    }
  }, [editRange, lines])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSave(text)
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
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
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
            onClick={() => onSave(text)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
