import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  onFileSelect: (index: number) => void
}

export function FileList({ onFileSelect }: Props) {
  const files = useAppStore(s => s.files)
  const currentFileIndex = useAppStore(s => s.currentFileIndex)
  const sidebarVisible = useAppStore(s => s.sidebarVisible)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; filePath: string } | null>(null)
  const contextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, filePath })
  }

  const copyPath = () => {
    if (contextMenu?.filePath) {
      navigator.clipboard.writeText(contextMenu.filePath)
    }
    setContextMenu(null)
  }

  if (!sidebarVisible) {
    return null
  }

  return (
    <div className="w-60 bg-gray-50 border-r flex flex-col h-full relative">
      {/* Header with VSCode-style toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-100">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">资源管理器</span>
        <button
          onClick={toggleSidebar}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-300 text-gray-400"
          title="收起文件列表"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.828 11.757a.5.5 0 01-.707 0L2.343 8.243a.5.5 0 010-.707l3.778-3.778a.5.5 0 11.707.707L3.757 8l3.064 3.05a.5.5 0 010 .707z"/>
            <path d="M9.172 11.757a.5.5 0 00.707 0l3.778-3.778a.5.5 0 000-.707l-3.778-3.778a.5.5 0 10-.707.707L12.243 8l-3.064 3.05a.5.5 0 000 .707z"/>
          </svg>
        </button>
      </div>

      {/* File count */}
      {files.length > 0 && (
        <div className="px-3 py-1 text-[10px] text-gray-400 border-b">
          {files.filter(f => f.done).length}/{files.length} 已校对
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-xs p-4">
            暂无文件
          </div>
        ) : (
          files.map((file, index) => (
            <div
              key={file.path}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors duration-100 ${
                index === currentFileIndex
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              onClick={() => onFileSelect(index)}
              onContextMenu={(e) => handleContextMenu(e, file.path)}
            >
              <span className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                file.done ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                {file.done ? '✓' : ''}
              </span>
              <span className="truncate flex-1">{file.name}</span>
            </div>
          ))
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed bg-white border rounded shadow-lg py-1 z-[9999] text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full text-left px-4 py-1.5 hover:bg-gray-100"
            onClick={copyPath}
          >
            复制完整路径
          </button>
        </div>
      )}
    </div>
  )
}
