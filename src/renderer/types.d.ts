export {}

interface RegexPresetData {
  id: string
  name: string
  pattern: string
  replacement: string
}

interface SessionData {
  filePaths: string[]
  proofreadStatus: Record<string, boolean>
  regexPresets?: RegexPresetData[]
  surroundPresets?: { id: string; name: string; prefix: string; suffix: string }[]
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
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
    }
  }
}
