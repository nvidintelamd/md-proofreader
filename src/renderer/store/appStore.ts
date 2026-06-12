import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  done: boolean
}

export type Mode = 'normal' | 'edit_select' | 'edit_modal'

interface AppState {
  files: FileItem[]
  currentFileIndex: number
  mdDir: string
  lines: string[]
  cursorLine: number
  mode: Mode
  editRange: { start: number; end: number } | null
  imageCache: Map<string, string>
  proofreadState: Record<string, boolean>
  sidebarVisible: boolean

  setFiles: (files: FileItem[]) => void
  setCurrentFileIndex: (index: number) => void
  setMdDir: (dir: string) => void
  setLines: (lines: string[]) => void
  setCursorLine: (index: number) => void
  setMode: (mode: Mode) => void
  setEditRange: (range: { start: number; end: number } | null) => void
  addImageToCache: (key: string, url: string) => void
  setProofreadState: (state: Record<string, boolean>) => void
  markFileDone: (index: number) => void
  toggleSidebar: () => void
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
  proofreadState: {},
  sidebarVisible: true,

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
  setProofreadState: (state) => set({ proofreadState: state }),
  markFileDone: (index) => {
    const { files, proofreadState } = get()
    const newFiles = [...files]
    if (newFiles[index]) {
      newFiles[index] = { ...newFiles[index], done: true }
      const newState = { ...proofreadState, [newFiles[index].path]: true }
      set({ files: newFiles, proofreadState: newState })
    }
  },
  toggleSidebar: () => set({ sidebarVisible: !get().sidebarVisible })
}))
