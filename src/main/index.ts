import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc-handlers'
import { downloader } from './downloader'
import { loadSettings } from './store'
import { setScraperProxy } from './scraper'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 16, y: 16 } } : {}),
    backgroundColor: '#fbf9f5',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  registerIpcHandlers(mainWindow)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.dmhy-desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    // Allow DevTools in production via Ctrl+Shift+I
    window.webContents.on('before-input-event', (_e, input) => {
      if (input.control && input.shift && input.key === 'I') {
        window.webContents.toggleDevTools()
      }
    })
  })

  const settings = loadSettings()
  downloader.setDownloadPath(settings.downloadPath)
  downloader.setProxyUrl(settings.proxyUrl || '')
  downloader.setSeedAfterDownload(settings.seedAfterDownload ?? false)
  setScraperProxy(settings.proxyUrl || '')

  // Create window immediately; aria2 starts in background
  createWindow()
  downloader.start().catch((e) => console.error('[downloader] start failed:', e))

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// before-quit fires on all platforms before the app actually exits.
// Use a quitting flag to prevent re-entry (app.quit() triggers before-quit again).
let quitting = false
app.on('before-quit', (e) => {
  if (quitting) return
  e.preventDefault()
  quitting = true
  downloader.destroy().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  app.quit()
})
