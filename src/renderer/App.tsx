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

  const { loadFiles, loadFileContent, loadLastSession } = useFileLoader()
  const { applyEdit, cancelEdit } = useEditMode()
  const { completeCurrentAndNext, isAllDone } = useProofreadState()

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  useKeyboardNav()

  // Auto-load last session on startup
  useEffect(() => {
    loadLastSession()
  }, [])

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
      {/* Custom title bar — draggable, no native frame */}
      <div
        ref={menuBarRef}
        className="bg-[#3c3c3c] flex items-center h-[30px] px-1 select-none text-xs flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* App icon placeholder */}
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>

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

        {/* Complete button */}
        {files.length > 0 && (
          <button
            onClick={completeCurrentAndNext}
            disabled={isAllDone()}
            className={`ml-1 px-2.5 py-1 rounded transition-colors ${
              isAllDone()
                ? 'text-white/30 cursor-not-allowed'
                : 'text-green-400 hover:bg-white/10 font-medium'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isAllDone() ? '全部完成 ✓' : '完成本篇校对'}
          </button>
        )}

        {/* Centered filename */}
        <div className="flex-1 text-center">
          {currentFileName && (
            <span className="text-white/40 text-[11px]">
              {currentFileName}
              {files.length > 1 && (
                <span className="text-white/25 ml-1">({currentFileIndex + 1}/{files.length})</span>
              )}
            </span>
          )}
        </div>

        {/* Window controls */}
        <div className="flex items-center flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => window.api.minimizeWindow()}
            className="w-[46px] h-[30px] flex items-center justify-center hover:bg-white/10 text-white/70"
          >
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => window.api.maximizeWindow()}
            className="w-[46px] h-[30px] flex items-center justify-center hover:bg-white/10 text-white/70"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          </button>
          <button
            onClick={() => window.api.closeWindow()}
            className="w-[46px] h-[30px] flex items-center justify-center hover:bg-red-500 hover:text-white text-white/70"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
              <line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body: activity bar + sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* VSCode-style vertical activity bar */}
        <div className="w-12 bg-[#333] flex flex-col items-center pt-1 gap-0.5 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className={`w-10 h-10 flex items-center justify-center border-l-2 ${
              sidebarVisible ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
            title="资源管理器"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <path d="M18 3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h14zm-1 2H5v12h12V5z"/>
              <path d="M7 7h3v2H7V7zm0 4h3v2H7v-2zm5-4h3v2h-3V7zm0 4h3v2h-3v-2z"/>
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <FileList onFileSelect={handleFileSelect} />

        {/* Preview */}
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
    <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        className={`px-2 py-1 rounded ${isOpen ? 'bg-white/10' : 'hover:bg-white/5'} text-white/80`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-lg py-1 min-w-[200px] z-50">
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
      className="w-full text-left px-4 py-1.5 hover:bg-white/10 flex items-center justify-between gap-4 text-white/80 text-xs"
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut && <span className="text-white/30 text-[10px]">{shortcut}</span>}
    </button>
  )
}
