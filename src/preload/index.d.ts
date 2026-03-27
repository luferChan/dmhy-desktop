import { ElectronAPI } from '@electron-toolkit/preload'

export interface Resource {
  id: string
  title: string
  detailUrl: string
  publishTime: string
  publisher: string
  publisherUrl: string
  teamId: string
  category: string
  size: string
  magnetUrl: string
  torrentUrl: string
}

export interface SearchResult {
  resources: Resource[]
  page: number
  hasMore: boolean
}

export interface DownloadTask {
  id: string
  magnetUrl: string
  name: string
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  downloaded: number
  total: number
  status: 'downloading' | 'paused' | 'completed' | 'error' | 'waiting' | 'seeding'
  error?: string
  savePath: string
  files: Array<{ name: string; length: number; progress: number }>
  eta: number
  addedAt: number
}

export interface AppSettings {
  downloadPath: string
  maxConcurrentDownloads: number
  proxyUrl: string
  seedAfterDownload: boolean
  searchHistory: string[]
  favoritePublishers: string[]
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      search(keyword: string, page: number, sortId: number, teamId?: string): Promise<SearchResult>
      getMagnet(detailUrl: string): Promise<string>
      copyText(text: string): Promise<boolean>
      openExternal(url: string): Promise<void>
      openPath(p: string): Promise<void>
      downloadAdd(url: string, title?: string, size?: string, detailUrl?: string): Promise<string>
      downloadPause(id: string): Promise<void>
      downloadResume(id: string): Promise<void>
      downloadRemove(id: string, deleteFiles: boolean): Promise<void>
      downloadList(): Promise<DownloadTask[]>
      onDownloadEvent(
        channel:
          | 'task-added'
          | 'task-updated'
          | 'task-progress'
          | 'task-completed'
          | 'task-error'
          | 'task-removed',
        cb: (data: unknown) => void
      ): () => void
      settingsGet(): Promise<AppSettings>
      settingsSave(settings: AppSettings): Promise<boolean>
      selectFolder(): Promise<string | null>
      platform: string
      windowMinimize(): Promise<void>
      windowMaximize(): Promise<void>
      windowClose(): Promise<void>
      windowIsMaximized(): Promise<boolean>
      onMainLog(cb: (msg: string) => void): () => void
    }
  }
}
