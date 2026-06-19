export {}

interface RegexPresetData {
  id: string
  name: string
  pattern: string
  replacement: string
}

interface SurroundPresetData {
  id: string
  name: string
  prefix: string
  suffix: string
}

interface PermanentPresetData {
  id: string
  name: string
  pattern: string
  replacement: string
}

interface PresetGroupData {
  id: string
  name: string
  presetIds: string[]
}

interface SessionData {
  filePaths: string[]
  proofreadStatus: Record<string, boolean>
  regexPresets?: RegexPresetData[]
  surroundPresets?: SurroundPresetData[]
}

interface PermanentData {
  presets: PermanentPresetData[]
  groups: PresetGroupData[]
}

declare global {
  interface Window {
    api: {
      openFiles: () => Promise<Array<{ name: string; path: string; size: number }>>
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
      saveImage: (mdDir: string, fileName: string, base64Data: string) => Promise<{ success: boolean; path?: string; error?: string }>
      readImage: (mdDir: string, imagePath: string) => Promise<{ success: boolean; dataUrl: string }>
      loadSession: () => Promise<SessionData>
      saveSession: (data: SessionData) => Promise<void>
      markDone: (filePath: string) => Promise<SessionData>
      resetFile: (filePath: string) => Promise<SessionData>
      loadPermanent: () => Promise<PermanentData>
      savePermanent: (data: PermanentData) => Promise<PermanentData>
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
    }
  }
}
