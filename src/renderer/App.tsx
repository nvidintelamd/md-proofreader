import React, { useEffect, useCallback } from 'react'
import { useAppStore } from './store/appStore'
import { useFileLoader } from './hooks/useFileLoader'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useEditMode } from './hooks/useEditMode'
import { useProofreadState } from './hooks/useProofreadState'
import { FileList } from './components/FileList'
import { PreviewArea } from './components/PreviewArea'
import { EditModal } from './components/EditModal'
import { StatusBar } from './components/StatusBar'
import { parseMdToBlocks } from './lib/mdParser'

export default function App() {
  const {
    files, currentFileIndex, mode, editRange, rawLines,
    setBlocks, setCursorBlock, setMode, setEditRange
  } = useAppStore()

  const { loadFiles, loadFileContent } = useFileLoader()
  const { applyEdit, cancelEdit } = useEditMode()
  const { completeCurrentAndNext, isAllDone } = useProofreadState()

  // Register keyboard navigation
  useKeyboardNav()

  const handleFileSelect = useCallback(async (index: number) => {
    const { files, setCurrentFileIndex, setCursorBlock } = useAppStore.getState()
    setCurrentFileIndex(index)
    setCursorBlock(0)
    await loadFileContent(files[index].path)
  }, [loadFileContent])

  const handleCompleteAndNext = useCallback(async () => {
    await completeCurrentAndNext()
  }, [completeCurrentAndNext])

  // Update blocks when rawLines change (after edit)
  useEffect(() => {
    if (rawLines.length > 0) {
      const content = rawLines.join('\n')
      const blocks = parseMdToBlocks(content)
      setBlocks(blocks)
    }
  }, [rawLines])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
            <span className="text-xl">📝</span>
            MD校对工具
          </h1>
          <div className="h-6 w-px bg-gray-200" />
          <span className="text-xs text-gray-500">
            {files.length > 0
              ? `${files[currentFileIndex]?.name || ''} (${currentFileIndex + 1}/${files.length})`
              : '请上传MD文件'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFiles}
            className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-black transition-colors"
          >
            上传MD文件
          </button>
          {files.length > 0 && (
            <button
              onClick={handleCompleteAndNext}
              disabled={isAllDone()}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                isAllDone()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isAllDone() ? '全部完成 ✓' : '完成本篇校对'}
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <FileList onFileSelect={handleFileSelect} />
        <div className="flex-1 flex flex-col bg-white">
          <PreviewArea />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Edit modal */}
      {mode === 'edit_modal' && editRange && (
        <EditModal
          onSave={applyEdit}
          onCancel={cancelEdit}
        />
      )}
    </div>
  )
}
