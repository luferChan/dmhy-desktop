import { ipcMain, BrowserWindow, shell, clipboard } from 'electron'
import { searchResources, getResourceDetail, getResourceFiles, setScraperProxy } from './scraper'
import { downloader } from './downloader'
import { loadSettings, saveSettings } from './store'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ── Search ──────────────────────────────────────────────────────────────
  ipcMain.handle('search', async (_e, keyword: string, page: number, sortId: number, teamId?: string) => {
    return searchResources(keyword, page, sortId, teamId)
  })

  ipcMain.handle('get-magnet', async (_e, detailUrl: string) => {
    return getResourceDetail(detailUrl)
  })

  // ── Clipboard ───────────────────────────────────────────────────────────
  ipcMain.handle('copy-text', (_e, text: string) => {
    clipboard.writeText(text)
    return true
  })

  // ── Open external ───────────────────────────────────────────────────────
  ipcMain.handle('open-external', (_e, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('open-path', (_e, p: string) => {
    shell.openPath(p)
  })

  // ── Downloads ───────────────────────────────────────────────────────────
  ipcMain.handle('download-add', async (_e, url: string, title?: string, size?: string, detailUrl?: string, savePath?: string) => {
    const settings = loadSettings()
    const id = await downloader.add(url, savePath || settings.downloadPath, title, size)
    if (detailUrl) {
      // Background: fetch file list to get actual filename; don't block task creation
      const sizeOnly = /^\d+(\.\d+)?\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)i?$/i
      getResourceFiles(detailUrl).then((files) => {
        if (files.length === 1 && !sizeOnly.test(files[0].trim())) {
          // Single file — use exact filename
          downloader.updateTaskName(id, files[0])
        }
        // Multiple files — keep search title; aria2 will set bittorrent.info.name later
      }).catch(() => {})
    }
    return id
  })

  ipcMain.handle('download-pause', (_e, id: string) => {
    downloader.pause(id)
  })

  ipcMain.handle('download-resume', (_e, id: string) => {
    downloader.resume(id)
  })

  ipcMain.handle('download-remove', (_e, id: string, deleteFiles: boolean) => {
    downloader.remove(id, deleteFiles)
  })

  ipcMain.handle('download-list', () => {
    return downloader.getTasks()
  })

  const send = (channel: string, data?: unknown): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data)
  }

  // Forward main-process logs to renderer; buffer until renderer is ready
  const pendingLogs: string[] = []
  let rendererReady = false
  mainWindow.webContents.once('did-finish-load', () => {
    rendererReady = true
    for (const msg of pendingLogs) send('main:log', msg)
    pendingLogs.length = 0
  })
  downloader.on('log', (msg: string) => {
    if (rendererReady) send('main:log', msg)
    else pendingLogs.push(msg)
  })

  // Forward download events to renderer
  downloader.on('task-added', (task) => { send('download:task-added', task) })
  downloader.on('task-updated', (task) => { send('download:task-updated', task) })
  downloader.on('task-progress', (data) => { send('download:task-progress', data) })
  downloader.on('task-completed', (task) => { send('download:task-completed', task) })
  downloader.on('task-error', (data) => { send('download:task-error', data) })
  downloader.on('task-removed', (data) => { send('download:task-removed', data) })

  // ── Window controls ──────────────────────────────────────────────────────
  ipcMain.handle('window-minimize', () => { mainWindow.minimize() })
  ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window-close', () => { mainWindow.close() })
  ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized())

  // ── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle('settings-get', () => {
    return loadSettings()
  })

  ipcMain.handle('settings-save', (_e, settings) => {
    saveSettings(settings)
    downloader.setDownloadPath(settings.downloadPath)
    downloader.setProxyUrl(settings.proxyUrl || '')
    downloader.setSeedAfterDownload(settings.seedAfterDownload ?? false)
    setScraperProxy(settings.proxyUrl || '')
    return true
  })

  // ── Select folder ────────────────────────────────────────────────────────
  ipcMain.handle('select-folder', async () => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })
}
