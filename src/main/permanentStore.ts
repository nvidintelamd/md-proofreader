import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'

const userDataPath = app.getPath('userData')
const permanentPath = join(userDataPath, 'permanent.json')

export interface PermanentPreset {
  id: string
  name: string
  pattern: string
  replacement: string
}

export interface PresetGroup {
  id: string
  name: string
  presetIds: string[]
}

export interface PermanentData {
  presets: PermanentPreset[]
  groups: PresetGroup[]
}

export async function readPermanent(): Promise<PermanentData> {
  try {
    const content = await readFile(permanentPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { presets: [], groups: [] }
  }
}

export async function writePermanent(data: PermanentData): Promise<void> {
  try {
    await mkdir(userDataPath, { recursive: true })
    await writeFile(permanentPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write permanent:', err)
  }
}
