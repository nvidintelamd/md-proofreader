export {}

declare global {
  interface Window {
    api: {
      openFiles: () => Promise<Array<{ name: string; path: string; size: number }>>
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
      readImage: (mdDir: string, imagePath: string) => Promise<{ success: boolean; dataUrl: string }>
      readProofreadState: (dir: string) => Promise<Record<string, boolean>>
      writeProofreadState: (dir: string, data: any) => Promise<{ success: boolean; error?: string }>
    }
  }
}
