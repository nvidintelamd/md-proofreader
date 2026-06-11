import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  onSave: (text: string) => void
  onCancel: () => void
}

export function EditModal({ onSave, onCancel }: Props) {
  const { blocks, editRange, imageCache, mdDir } = useAppStore()
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editRange) {
      const selectedLines: string[] = []
      for (let i = editRange.start; i <= editRange.end; i++) {
        if (blocks[i]) {
          selectedLines.push(...blocks[i].lines)
        }
      }
      setText(selectedLines.join('\n'))
    }
  }, [editRange, blocks])

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
    // Save on Ctrl+S
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
    const afterCursor = text.slice(cursorPos)

    // Check if cursor is at end of an image line
    const lines = beforeCursor.split('\n')
    const currentLine = lines[lines.length - 1]
    const imgMatch = currentLine.match(/!\[.*?\]\((.*?)\)$/)

    if (imgMatch) {
      e.preventDefault()
      // Remove the image link
      const newLine = currentLine.slice(0, currentLine.lastIndexOf('![]'))
      lines[lines.length - 1] = newLine
      const newText = [...lines, ...afterCursor.split('\n')].join('\n')
      setText(newText)

      // Set cursor position
      setTimeout(() => {
        const newPos = newLine.length + (lines.length > 1 ? lines.slice(0, -1).join('\n').length + 1 : 0)
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    }
  }

  // Render images in the edit area
  const renderContent = () => {
    const imgRegex = /!\[.*?\]\((.*?)\)/g
    const lines = text.split('\n')

    return lines.map((line, i) => {
      const imgMatch = line.match(/!\[.*?\]\((.*?)\)/)
      if (imgMatch) {
        const imgPath = imgMatch[1].trim()
        const cacheKey = `${mdDir}::${imgPath}`
        const src = imageCache.get(cacheKey) || imgPath
        return (
          <div key={i} className="flex items-center gap-2 py-1">
            <img
              src={src}
              alt=""
              className="max-h-12 rounded border border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-xs text-gray-500 font-mono">{line}</span>
          </div>
        )
      }
      return null
    }).filter(Boolean)
  }

  const hasImages = text.includes('![')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-2xl w-[800px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-700">
            编辑选区
            {editRange && (
              <span className="text-xs text-gray-400 ml-2">
                块 {editRange.start + 1}-{editRange.end + 1}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> 取消
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl+S</kbd> 保存
          </div>
        </div>

        {/* Image preview area */}
        {hasImages && (
          <div className="px-4 py-2 border-b bg-gray-50">
            <div className="text-[10px] text-gray-400 mb-1">图片预览（在图片行按 Backspace 删除链接）</div>
            <div className="flex flex-wrap gap-2">
              {renderContent()}
            </div>
          </div>
        )}

        {/* Textarea */}
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

        {/* Footer */}
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
