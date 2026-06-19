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

export interface RegexPreset {
  id: string
  name: string
  pattern: string
  replacement: string
}

export interface SurroundPreset {
  id: string
  name: string
  prefix: string
  suffix: string
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

  // Regex presets
  regexPresets: RegexPreset[]
  showRegexPanel: boolean
  editingRegexPreset: RegexPreset | null

  // Surround presets
  surroundPresets: SurroundPreset[]

  // Permanent manager
  showPermManager: boolean

  // Dirty state & save toast
  isDirty: boolean
  showSaveToast: boolean

  setFiles: (files: FileItem[]) => void
  setCurrentFileIndex: (index: number) => void
  setMdDir: (dir: string) => void
  setLines: (lines: string[]) => void
  setIsDirty: (dirty: boolean) => void
  triggerSaveToast: () => void
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

  // Regex
  setRegexPresets: (presets: RegexPreset[]) => void
  addRegexPreset: (preset: RegexPreset) => void
  deleteRegexPreset: (id: string) => void
  updateRegexPreset: (id: string, data: Partial<Omit<RegexPreset, 'id'>>) => void
  setShowRegexPanel: (show: boolean) => void
  setEditingRegexPreset: (preset: RegexPreset | null) => void

  setSurroundPresets: (presets: SurroundPreset[]) => void
  addSurroundPreset: (preset: SurroundPreset) => void
  deleteSurroundPreset: (id: string) => void
  updateSurroundPreset: (id: string, data: Partial<Omit<SurroundPreset, 'id'>>) => void

  setShowPermManager: (show: boolean) => void

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

  regexPresets: [],
  showRegexPanel: false,
  editingRegexPreset: null,

  surroundPresets: [],

  showPermManager: false,

  isDirty: false,
  showSaveToast: false,

  setFiles: (files) => set({ files }),
  setCurrentFileIndex: (index) => set({ currentFileIndex: index }),
  setMdDir: (dir) => set({ mdDir: dir }),
  setLines: (lines) => set({ lines }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  triggerSaveToast: () => {
    set({ showSaveToast: true })
    setTimeout(() => set({ showSaveToast: false }), 2000)
  },
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

  setEditedRange: (range) => set({ editedRange: range, isDirty: range !== null }),

  setRegexPresets: (presets) => set({ regexPresets: presets }),
  addRegexPreset: (preset) => set({ regexPresets: [...get().regexPresets, preset] }),
  deleteRegexPreset: (id) => set({ regexPresets: get().regexPresets.filter(p => p.id !== id) }),
  updateRegexPreset: (id, data) => set({
    regexPresets: get().regexPresets.map(p => p.id === id ? { ...p, ...data } : p)
  }),
  setShowRegexPanel: (show) => set({ showRegexPanel: show }),
  setEditingRegexPreset: (preset) => set({ editingRegexPreset: preset }),

  setSurroundPresets: (presets) => set({ surroundPresets: presets }),
  addSurroundPreset: (preset) => set({ surroundPresets: [...get().surroundPresets, preset] }),
  deleteSurroundPreset: (id) => set({ surroundPresets: get().surroundPresets.filter(p => p.id !== id) }),
  updateSurroundPreset: (id, data) => set({
    surroundPresets: get().surroundPresets.map(p => p.id === id ? { ...p, ...data } : p)
  }),

  setShowPermManager: (show) => set({ showPermManager: show }),

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
      cursorLine: state.cursorLine,
      isDirty: state.editedRange !== null
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
      cursorLine: 0,
      isDirty: false
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
