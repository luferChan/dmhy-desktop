import React from 'react'
import { useEffect, useState } from 'react'
import { Search, Download, Settings, Leaf, Minus, Maximize2, Minimize2, X } from 'lucide-react'
import SearchPage from './pages/Search'
import DownloadsPage from './pages/Downloads'
import SettingsPage from './pages/Settings'
import { useDownloadStore, useSettingsStore, useUIStore, type AppPage } from './store'
import type { DownloadTask } from './types'

const isWin = window.api.platform === 'win32'

export default function App(): React.JSX.Element {
  const { currentPage: page, setPage } = useUIStore()
  const [isMaximized, setIsMaximized] = useState(false)
  const { addTask, updateTask, updateProgress, removeTask, setTasks } = useDownloadStore()
  const { setSettings } = useSettingsStore()

  useEffect(() => {
    window.api.settingsGet().then(setSettings)
    window.api.downloadList().then(setTasks)
    if (isWin) window.api.windowIsMaximized().then(setIsMaximized)
  }, [])

  useEffect(() => {
    return window.api.onMainLog((msg) => console.log('[Main]', msg))
  }, [])

  useEffect(() => {
    const offs = [
      window.api.onDownloadEvent('task-added', (d) => addTask(d as DownloadTask)),
      window.api.onDownloadEvent('task-updated', (d) => updateTask(d as DownloadTask)),
      window.api.onDownloadEvent('task-progress', (d) =>
        updateProgress(d as DownloadTask & { id: string })
      ),
      window.api.onDownloadEvent('task-completed', (d) => updateTask(d as DownloadTask)),
      window.api.onDownloadEvent('task-error', (d) => {
        const { id, error } = d as { id: string; error: string }
        updateProgress({ id, error, status: 'error' } as Partial<DownloadTask> & { id: string })
      }),
      window.api.onDownloadEvent('task-removed', (d) =>
        removeTask((d as { id: string }).id)
      )
    ]
    return () => offs.forEach((off) => off())
  }, [])

  const tasks = useDownloadStore((s) => s.tasks)
  const activeCount = Array.from(tasks.values()).filter(
    (t) => t.status === 'downloading' || t.status === 'waiting'
  ).length

  async function handleMaximize(): Promise<void> {
    await window.api.windowMaximize()
    setIsMaximized(await window.api.windowIsMaximized())
  }

  const navItems: { id: AppPage; icon: React.JSX.Element; label: string; badge?: number }[] = [
    { id: 'search', icon: <Search size={18} />, label: '搜索' },
    { id: 'downloads', icon: <Download size={18} />, label: '下载', badge: activeCount || undefined },
    { id: 'settings', icon: <Settings size={18} />, label: '设置' }
  ]

  return (
    <div className="flex flex-col h-full bg-[#fbf9f5] text-[#31332f]">
      {/* Windows-only: thin drag titlebar with native controls */}
      {isWin && (
        <div className="drag-region flex items-center w-full h-9 bg-[#f5f4ef] shrink-0">
          <div className="ml-auto flex items-center">
            <button
              onClick={() => window.api.windowMinimize()}
              title="最小化"
              className="no-drag flex items-center justify-center w-9 h-9 text-[#7a7b76] hover:bg-[#e9e8e3] hover:text-[#31332f] transition-colors cursor-pointer"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={handleMaximize}
              title={isMaximized ? '向下还原' : '最大化'}
              className="no-drag flex items-center justify-center w-9 h-9 text-[#7a7b76] hover:bg-[#e9e8e3] hover:text-[#31332f] transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
              onClick={() => window.api.windowClose()}
              title="关闭"
              className="no-drag flex items-center justify-center w-9 h-9 text-[#7a7b76] hover:bg-[#a73b21] hover:text-white transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Wide sidebar */}
        <aside className={`drag-region flex flex-col w-64 bg-[#f5f4ef] shrink-0 ${isWin ? 'pt-4' : 'pt-10'}`}>
          {/* Brand identity */}
          <div className="no-drag px-6 mb-8 mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4e9c3] flex items-center justify-center shrink-0">
                <Leaf size={18} className="text-[#526446]" />
              </div>
              <div>
                <h1 className="font-headline text-xl font-bold text-[#526446] leading-none">动漫花园</h1>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#5e605b] opacity-60 mt-0.5">Anime Garden</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-0.5 pr-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className={`no-drag relative flex items-center gap-3 py-3 px-6 rounded-r-full text-sm font-medium transition-all duration-200 cursor-pointer
                  ${page === item.id
                    ? 'bg-[#d4e9c3] text-[#31332f] font-semibold'
                    : 'text-[#705c45] hover:bg-[#e9e8e3] hover:text-[#31332f]'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1 text-[10px] font-bold bg-[#526446] text-white rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Botanical accent */}
          <div className="mt-auto px-8 py-8 pointer-events-none select-none opacity-10">
            <Leaf size={72} className="text-[#526446]" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-[#fbf9f5]">
          {page === 'search' && <SearchPage />}
          {page === 'downloads' && <DownloadsPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  )
}
