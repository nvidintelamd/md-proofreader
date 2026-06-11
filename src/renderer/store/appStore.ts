import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  done: boolean
}

export interface Block {
  id: number
  type: 'heading' | 'paragraph' | 'math' | 'table' | 'image' | 'hr' | 'code'
  level?: number
  lines: string[]
  startLine: number
  endLine: number
  html?: string
}

export type Mode = 'normal' | 'edit_select' | 'edit_modal'

interface AppState {
  files: FileItem[]
  currentFileIndex: number
  mdDir: string
  blocks: Block[]
  rawLines: string[]
  cursorBlock: number
  mode: Mode
  editRange: { start: number; end: number } | null
  imageCache: Map<string, string>
  proofreadState: Record<string, boolean>

  setFiles: (files: FileItem[]) => void
  setCurrentFileIndex: (index: number) => void
  setMdDir: (dir: string) => void
  setBlocks: (blocks: Block[]) => void
  setRawLines: (lines: string[]) => void
  setCursorBlock: (index: number) => void
  setMode: (mode: Mode) => void
  setEditRange: (range: { start: number; end: number } | null) => void
  setImageCache: (cache: Map<string, string>) => void
  addImageToCache: (key: string, url: string) => void
  setProofreadState: (state: Record<string, boolean>) => void
  markFileDone: (index: number) => void
  reorderFiles: (fromIndex: number, toIndex: number) => void
  applyBlockEdit: (startBlock: number, endBlock: number, newLines: string[]) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  files: [],
  currentFileIndex: 0,
  mdDir: '',
  blocks: [],
  rawLines: [],
  cursorBlock: 0,
  mode: 'normal',
  editRange: null,
  imageCache: new Map(),
  proofreadState: {},

  setFiles: (files) => set({ files }),
  setCurrentFileIndex: (index) => set({ currentFileIndex: index }),
  setMdDir: (dir) => set({ mdDir: dir }),
  setBlocks: (blocks) => set({ blocks }),
  setRawLines: (lines) => set({ rawLines: lines }),
  setCursorBlock: (index) => {
    const { blocks } = get()
    const clamped = Math.max(0, Math.min(index, blocks.length - 1))
    set({ cursorBlock: clamped })
  },
  setMode: (mode) => set({ mode }),
  setEditRange: (range) => set({ editRange: range }),
  setImageCache: (cache) => set({ imageCache: cache }),
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
  reorderFiles: (fromIndex, toIndex) => {
    const { files } = get()
    const newFiles = [...files]
    const [moved] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, moved)
    set({ files: newFiles })
  },
  applyBlockEdit: (startBlock, endBlock, newLines) => {
    const { blocks, rawLines } = get()
    const startLine = blocks[startBlock].startLine
    const endLine = blocks[endBlock].endLine

    const before = rawLines.slice(0, startLine)
    const after = rawLines.slice(endLine + 1)
    const newRawLines = [...before, ...newLines, ...after]

    set({ rawLines: newRawLines })
  }
}))
