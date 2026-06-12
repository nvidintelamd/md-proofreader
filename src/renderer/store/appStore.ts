import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  done: boolean
}

export type Mode = 'normal' | 'edit_select' | 'edit_modal'

export interface UndoEntry {
  lines: string[]
  range: { start: number; end: number }
}

export interface FileState {
  editRange: { start: number; end: number } | null
  editedRange: { start: number; end: number } | null
  undoStack: UndoEntry[]
  cursorLine: number
  scrollTop: number
}

function createFileState(): FileState {
  return { editRange: null, editedRange: null, undoStack: [], cursorLine: 0, scrollTop: 0 }
}

interface AppState {
  files: FileItem[]
  currentFileIndex: number
  mdDir: string
  lines: string[]
  cursorLine: number
  mode: Mode
  editRange: { start: number; end: number } | null
  imageCache: Map<string, string>
  sidebarVisible: boolean

  // Per-file state map (keyed by file path)
  fileStates: Record<string, FileState>

  // Drag
  dragStart: number | null
  dragEnd: number | null
  isDragging: boolean

  // Edited range (for purple highlight) — derived from fileState
  editedRange: { start: number; end: number } | null

  // Undo — derived from fileState
  undoStack: UndoEntry[]

  setFiles: (files: FileItem[]) => void
  setCurrentFileIndex: (index: number) => void
  setMdDir: (dir: string) => void
  setLines: (lines: string[]) => void
  setCursorLine: (index: number) => void
  setMode: (mode: Mode) => void
  setEditRange: (range: { start: number; end: number } | null) => void
  addImageToCache: (key: string, url: string) => void
  markFileDoneLocal: (index: number) => void
  toggleSidebar: () => void

  startDrag: (index: number) => void
  updateDrag: (index: number) => void
  endDrag: () => void

  pushUndo: (entry: UndoEntry) => void
  undo: () => void

  setEditedRange: (range: { start: number; end: number } | null) => void

  // Per-file state management
  saveCurrentFileState: () => void
  restoreFileState: (filePath: string) => void
  clearFileState: (filePath: string) => void
  setScrollTop: (top: number) => void
}

function getCurrentFilePath(get: () => AppState): string {
  const { files, currentFileIndex } = get()
  return files[currentFileIndex]?.path || ''
}

export const useAppStore = create<AppState>((set, get) => ({
  files: [],
  currentFileIndex: 0,
  mdDir: '',
  lines: [],
  cursorLine: 0,
  mode: 'normal',
  editRange: null,
  imageCache: new Map(),
  sidebarVisible: true,

  fileStates: {},

  dragStart: null,
  dragEnd: null,
  isDragging: false,

  editedRange: null,
  undoStack: [],

  setFiles: (files) => set({ files }),
  setCurrentFileIndex: (index) => set({ currentFileIndex: index }),
  setMdDir: (dir) => set({ mdDir: dir }),
  setLines: (lines) => set({ lines }),
  setCursorLine: (index) => {
    const { lines } = get()
    const clamped = Math.max(0, Math.min(index, lines.length - 1))
    set({ cursorLine: clamped })
  },
  setMode: (mode) => set({ mode }),
  setEditRange: (range) => set({ editRange: range }),
  addImageToCache: (key, url) => {
    const cache = new Map(get().imageCache)
    cache.set(key, url)
    set({ imageCache: cache })
  },
  markFileDoneLocal: (index) => {
    const { files } = get()
    const newFiles = [...files]
    if (newFiles[index]) {
      newFiles[index] = { ...newFiles[index], done: true }
      set({ files: newFiles })
    }
  },
  toggleSidebar: () => set({ sidebarVisible: !get().sidebarVisible }),

  startDrag: (index) => set({ dragStart: index, dragEnd: index, isDragging: true }),
  updateDrag: (index) => {
    if (get().isDragging) set({ dragEnd: index })
  },
  endDrag: () => {
    const { dragStart, dragEnd } = get()
    if (dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)
      set({
        editRange: { start, end },
        cursorLine: end,
        isDragging: false,
        dragStart: null,
        dragEnd: null
      })
    } else {
      set({ isDragging: false, dragStart: null, dragEnd: null })
    }
  },

  pushUndo: (entry) => set({ undoStack: [...get().undoStack, entry] }),
  undo: () => {
    const { undoStack, setLines, setEditRange, setEditedRange, setCursorLine } = get()
    if (undoStack.length === 0) return
    const entry = undoStack[undoStack.length - 1]
    set({ undoStack: undoStack.slice(0, -1) })
    setLines(entry.lines)
    setEditedRange(entry.range)
    setCursorLine(entry.range.start)
    setEditRange(null)
  },

  setEditedRange: (range) => set({ editedRange: range }),

  saveCurrentFileState: () => {
    const filePath = getCurrentFilePath(get)
    if (!filePath) return
    const { editRange, editedRange, undoStack, cursorLine } = get()
    const states = { ...get().fileStates }
    states[filePath] = { editRange, editedRange, undoStack, cursorLine, scrollTop: 0 }
    set({ fileStates: states })
  },

  restoreFileState: (filePath: string) => {
    const { fileStates } = get()
    const state = fileStates[filePath] || createFileState()
    set({
      editRange: state.editRange,
      editedRange: state.editedRange,
      undoStack: state.undoStack,
      cursorLine: state.cursorLine
    })
  },

  clearFileState: (filePath: string) => {
    const states = { ...get().fileStates }
    delete states[filePath]
    set({
      fileStates: states,
      editRange: null,
      editedRange: null,
      undoStack: [],
      cursorLine: 0
    })
  },

  setScrollTop: (top: number) => {
    const filePath = getCurrentFilePath(get)
    if (!filePath) return
    const states = { ...get().fileStates }
    if (!states[filePath]) states[filePath] = createFileState()
    states[filePath].scrollTop = top
    set({ fileStates: states })
  }
}))
