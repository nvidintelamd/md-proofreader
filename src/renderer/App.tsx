import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { useFileLoader } from './hooks/useFileLoader'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useEditMode } from './hooks/useEditMode'
import { useProofreadState } from './hooks/useProofreadState'
import { FileList } from './components/FileList'
import { PreviewArea } from './components/PreviewArea'
import { EditModal } from './components/EditModal'
import { StatusBar } from './components/StatusBar'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  const files = useAppStore(s => s.files)
  const currentFileIndex = useAppStore(s => s.currentFileIndex)
  const mode = useAppStore(s => s.mode)

  const { loadFiles, loadFileContent } = useFileLoader()
  const { applyEdit, cancelEdit } = useEditMode()
  const { completeCurrentAndNext, isAllDone } = useProofreadState()

  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useKeyboardNav()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  const handleFileSelect = useCallback(async (index: number) => {
    const { files, setCurrentFileIndex, setCursorLine } = useAppStore.getState()
    setCurrentFileIndex(index)
    setCursorLine(0)
    try {
      await loadFileContent(files[index].path)
    } catch (err) {
      console.error('Failed to load file:', err)
    }
  }, [loadFileContent])

  const handleOpenFiles = useCallback(async () => {
    setFileMenuOpen(false)
    await loadFiles()
  }, [loadFiles])

  const currentFileName = files[currentFileIndex]?.name || ''

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Menu bar */}
      <header className="bg-white border-b flex items-center h-9 px-2 shadow-sm z-50 select-none">
        {/* File menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
          >
            File
          </button>
          {fileMenuOpen && (
            <div className="absolute top-full left-0 mt-0.5 bg-white border rounded shadow-lg py-1 w-44 z-50">
              <button
                className="w-full text-left px-4 py-1.5 text-xs hover:bg-gray-100"
                onClick={handleOpenFiles}
              >
                打开MD文件
              </button>
            </div>
          )}
        </div>

        {/* Complete button (next to menu) */}
        {files.length > 0 && (
          <button
            onClick={completeCurrentAndNext}
            disabled={isAllDone()}
            className={`ml-2 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              isAllDone()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isAllDone() ? '全部完成 ✓' : '完成本篇校对'}
          </button>
        )}

        {/* Centered filename */}
        <div className="flex-1 text-center">
          {currentFileName && (
            <span className="text-xs text-gray-500">
              {currentFileName}
              {files.length > 1 && (
                <span className="text-gray-300 ml-1">({currentFileIndex + 1}/{files.length})</span>
              )}
            </span>
          )}
        </div>

        {/* Right spacer to balance layout */}
        <div style={{ width: '120px' }} />
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <FileList onFileSelect={handleFileSelect} />
        <div className="flex-1 flex flex-col bg-white">
          <ErrorBoundary>
            <PreviewArea onOpenFiles={handleOpenFiles} />
          </ErrorBoundary>
        </div>
      </div>

      <StatusBar />

      {mode === 'edit_modal' && (
        <EditModal onSave={applyEdit} onCancel={cancelEdit} />
      )}
    </div>
  )
}
