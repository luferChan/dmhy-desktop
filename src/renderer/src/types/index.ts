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

export const CATEGORIES = [
  { id: 0, label: '全部' },
  { id: 2, label: '動畫' },
  { id: 3, label: '漫畫' },
  { id: 4, label: '音樂' },
  { id: 6, label: '日劇' },
  { id: 7, label: '遊戲' },
  { id: 9, label: '其他' }
]
