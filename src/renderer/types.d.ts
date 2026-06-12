export {}

declare global {
  interface Window {
    api: {
      openFiles: () => Promise<Array<{ name: string; path: string; size: number }>>
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
      saveImage: (mdDir: string, fileName: string, base64Data: string) => Promise<{ success: boolean; path?: string; error?: string }>
      readImage: (mdDir: string, imagePath: string) => Promise<{ success: boolean; dataUrl: string }>
      loadSession: () => Promise<{ filePaths: string[]; proofreadStatus: Record<string, boolean> }>
      saveSession: (data: { filePaths: string[]; proofreadStatus: Record<string, boolean> }) => Promise<void>
      markDone: (filePath: string) => Promise<{ filePaths: string[]; proofreadStatus: Record<string, boolean> }>
      resetFile: (filePath: string) => Promise<{ filePaths: string[]; proofreadStatus: Record<string, boolean> }>
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
    }
  }
}
