import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Search
  search: (keyword: string, page: number, sortId: number, teamId?: string) =>
    ipcRenderer.invoke('search', keyword, page, sortId, teamId),
  getMagnet: (detailUrl: string) => ipcRenderer.invoke('get-magnet', detailUrl),

  // Clipboard & shell
  copyText: (text: string) => ipcRenderer.invoke('copy-text', text),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openPath: (p: string) => ipcRenderer.invoke('open-path', p),

  // Downloads
  downloadAdd: (url: string, title?: string, size?: string, detailUrl?: string) => ipcRenderer.invoke('download-add', url, title, size, detailUrl),
  downloadPause: (id: string) => ipcRenderer.invoke('download-pause', id),
  downloadResume: (id: string) => ipcRenderer.invoke('download-resume', id),
  downloadRemove: (id: string, deleteFiles: boolean) =>
    ipcRenderer.invoke('download-remove', id, deleteFiles),
  downloadList: () => ipcRenderer.invoke('download-list'),

  // Download events
  onDownloadEvent: (
    channel: 'task-added' | 'task-updated' | 'task-progress' | 'task-completed' | 'task-error' | 'task-removed',
    cb: (data: unknown) => void
  ) => {
    const fullChannel = `download:${channel}`
    ipcRenderer.on(fullChannel, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(fullChannel)
  },

  // Settings
  settingsGet: () => ipcRenderer.invoke('settings-get'),
  settingsSave: (settings: unknown) => ipcRenderer.invoke('settings-save', settings),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Main process log bridge
  onMainLog: (cb: (msg: string) => void) => {
    ipcRenderer.on('main:log', (_e, msg) => cb(msg))
    return () => ipcRenderer.removeAllListeners('main:log')
  },

  // Window controls
  platform: process.platform,
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
