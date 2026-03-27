import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface AppSettings {
  downloadPath: string
  maxConcurrentDownloads: number
  proxyUrl: string
  seedAfterDownload: boolean
  searchHistory: string[]
  favoritePublishers: string[]
}

const DEFAULT_SETTINGS: AppSettings = {
  downloadPath: app.getPath('downloads'),
  maxConcurrentDownloads: 3,
  proxyUrl: '',
  seedAfterDownload: false,
  searchHistory: [],
  favoritePublishers: []
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  const dir = path.dirname(getStorePath())
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getStorePath(), JSON.stringify(settings, null, 2), 'utf-8')
}
