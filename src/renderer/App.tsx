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
  const sidebarVisible = useAppStore(s => s.sidebarVisible)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)

  const { loadFiles, loadFileContent } = useFileLoader()
  const { applyEdit, cancelEdit } = useEditMode()
  const { completeCurrentAndNext, isAllDone } = useProofreadState()

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  useKeyboardNav()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
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
    setOpenMenu(null)
    await loadFiles()
  }, [loadFiles])

  const currentFileName = files[currentFileIndex]?.name || ''

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Single-row menu bar */}
      <div
        ref={menuBarRef}
        className="bg-white border-b flex items-center h-8 px-1 shadow-sm z-50 select-none text-xs"
      >
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 flex-shrink-0"
          title={sidebarVisible ? '收起侧边栏' : '展开侧边栏'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z"/>
            <path d="M6 4.5h5a.5.5 0 010 1H6a.5.5 0 010-1zm0 3h5a.5.5 0 010 1H6a.5.5 0 010-1zm0 3h5a.5.5 0 010 1H6a.5.5 0 010-1zM3 4.5a.5.5 0 110-1 .5.5 0 010 1zm0 3a.5.5 0 110-1 .5.5 0 010 1zm0 3a.5.5 0 110-1 .5.5 0 010 1z"/>
          </svg>
        </button>

        {/* Menu items */}
        <MenuBarItem
          label="文件(F)"
          isOpen={openMenu === '文件'}
          onClick={() => setOpenMenu(openMenu === '文件' ? null : '文件')}
          onMouseEnter={() => { if (openMenu) setOpenMenu('文件') }}
        >
          <MenuItem label="打开MD文件" shortcut="Ctrl+O" onClick={handleOpenFiles} />
        </MenuBarItem>

        <MenuBarItem
          label="编辑(E)"
          isOpen={openMenu === '编辑'}
          onClick={() => setOpenMenu(openMenu === '编辑' ? null : '编辑')}
          onMouseEnter={() => { if (openMenu) setOpenMenu('编辑') }}
        >
          <MenuItem label="撤销" shortcut="Ctrl+Z" onClick={() => document.execCommand('undo')} />
          <MenuItem label="重做" shortcut="Ctrl+Y" onClick={() => document.execCommand('redo')} />
        </MenuBarItem>

        <MenuBarItem
          label="查看(V)"
          isOpen={openMenu === '查看'}
          onClick={() => setOpenMenu(openMenu === '查看' ? null : '查看')}
          onMouseEnter={() => { if (openMenu) setOpenMenu('查看') }}
        >
          <MenuItem label="重新加载" shortcut="Ctrl+R" onClick={() => window.location.reload()} />
        </MenuBarItem>

        {/* Complete button — direct, no dropdown */}
        {files.length > 0 && (
          <button
            onClick={completeCurrentAndNext}
            disabled={isAllDone()}
            className={`ml-1 px-2.5 py-1 rounded transition-colors ${
              isAllDone()
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-green-700 hover:bg-green-50 font-medium'
            }`}
          >
            {isAllDone() ? '全部完成 ✓' : '完成本篇校对'}
          </button>
        )}

        {/* Right-aligned filename */}
        <div className="flex-1 text-right pr-2">
          {currentFileName && (
            <span className="text-gray-400">
              {currentFileName}
              {files.length > 1 && (
                <span className="text-gray-300 ml-1">({currentFileIndex + 1}/{files.length})</span>
              )}
            </span>
          )}
        </div>
      </div>

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

function MenuBarItem({ label, isOpen, onClick, onMouseEnter, children }: {
  label: string
  isOpen: boolean
  onClick: () => void
  onMouseEnter: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        className={`px-2 py-1 rounded ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-50'} text-gray-600`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-0 bg-white border rounded shadow-lg py-1 min-w-[180px] z-50">
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, shortcut, onClick }: {
  label: string
  shortcut?: string
  onClick: () => void
}) {
  return (
    <button
      className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center justify-between gap-4"
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut && <span className="text-gray-400 text-[10px]">{shortcut}</span>}
    </button>
  )
}
