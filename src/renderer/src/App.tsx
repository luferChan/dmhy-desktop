import React from 'react'
import { useEffect, useState } from 'react'
import { Search, Download, Settings, Antenna, Minus, Maximize2, Minimize2, X } from 'lucide-react'
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
    { id: 'search', icon: <Search size={20} />, label: '搜索' },
    {
      id: 'downloads',
      icon: <Download size={20} />,
      label: '下载',
      badge: activeCount || undefined
    },
    { id: 'settings', icon: <Settings size={20} />, label: '设置' }
  ]

  return (
    <div className="flex flex-col h-full bg-[#0F0F23] text-[#E2E8F0]">
      {/* Top bar — drag region, macOS traffic lights appear here, Windows controls on right */}
      <div className="drag-region flex items-center w-full h-11 bg-[#16162a] border-b border-[#2a2a4a] shrink-0">
        {isWin && (
          <div className="ml-auto flex items-center">
            <button
              onClick={() => window.api.windowMinimize()}
              title="最小化"
              className="no-drag flex items-center justify-center w-11 h-11 text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#E2E8F0] transition-colors duration-150 cursor-pointer"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={handleMaximize}
              title={isMaximized ? '向下还原' : '最大化'}
              className="no-drag flex items-center justify-center w-11 h-11 text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#E2E8F0] transition-colors duration-150 cursor-pointer"
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={() => window.api.windowClose()}
              title="关闭"
              className="no-drag flex items-center justify-center w-11 h-11 text-[#94A3B8] hover:bg-[#F43F5E] hover:text-white transition-colors duration-150 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Body — sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — entire column is drag region; interactive children opt out */}
        <aside className="drag-region flex flex-col items-center w-16 bg-[#16162a] border-r border-[#2a2a4a] shrink-0">
          {/* Logo */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#F43F5E] mt-3 mb-3">
            <Antenna size={18} className="text-white" />
          </div>

          {/* Nav items */}
          <div className="flex flex-col items-center gap-1 w-full px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className={`no-drag relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer
                  ${
                    page === item.id
                      ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED33]'
                      : 'text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#E2E8F0]'
                  }`}
              >
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-[#F43F5E] text-white rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {page === 'search' && <SearchPage />}
          {page === 'downloads' && <DownloadsPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  )
}
