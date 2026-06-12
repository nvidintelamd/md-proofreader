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

  // Drag selection
  dragStart: number | null
  dragEnd: number | null
  isDragging: boolean

  // Undo
  undoStack: UndoEntry[]

  // Edited line range (for purple highlight)
  editedRange: { start: number; end: number } | null

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

  // Drag
  startDrag: (index: number) => void
  updateDrag: (index: number) => void
  endDrag: () => void

  // Undo
  pushUndo: (entry: UndoEntry) => void
  undo: () => void
  clearUndo: () => void

  // Edited range
  setEditedRange: (range: { start: number; end: number } | null) => void
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

  dragStart: null,
  dragEnd: null,
  isDragging: false,

  undoStack: [],

  editedRange: null,

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
  clearUndo: () => set({ undoStack: [] }),

  setEditedRange: (range) => set({ editedRange: range })
}))
