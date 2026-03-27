import React from 'react'
import { Download, Inbox } from 'lucide-react'
import { useDownloadStore } from '../store'
import DownloadItem from '../components/DownloadItem'

export default function DownloadsPage(): React.JSX.Element {
  const tasks = useDownloadStore((s) => s.tasks)
  const taskList = Array.from(tasks.values()).sort((a, b) => b.addedAt - a.addedAt)

  const active = taskList.filter(
    (t) => t.status === 'downloading' || t.status === 'waiting' || t.status === 'seeding'
  )
  const paused = taskList.filter((t) => t.status === 'paused')
  const completed = taskList.filter((t) => t.status === 'completed')
  const errored = taskList.filter((t) => t.status === 'error')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="drag-region flex items-center gap-2 px-4 py-3 border-b border-[#2a2a4a] bg-[#16162a] shrink-0">
        <Download size={18} className="text-[#A78BFA]" />
        <h1 className="text-sm font-semibold text-[#E2E8F0]">下载管理</h1>
        {taskList.length > 0 && (
          <span className="ml-auto text-xs text-[#94A3B8]">
            {active.length > 0 && `${active.length} 进行中`}
            {paused.length > 0 && ` · ${paused.length} 已暂停`}
            {completed.length > 0 && ` · ${completed.length} 已完成`}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {taskList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[#475569] gap-2">
            <Inbox size={48} className="opacity-20" />
            <p className="text-sm">暂无下载任务</p>
            <p className="text-xs">在搜索页面点击下载按钮添加任务</p>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <div className="px-4 py-1.5 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider bg-[#0F0F23] sticky top-0">
              进行中
            </div>
            {active.map((t) => <DownloadItem key={t.id} task={t} />)}
          </section>
        )}

        {paused.length > 0 && (
          <section>
            <div className="px-4 py-1.5 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider bg-[#0F0F23] sticky top-0">
              已暂停
            </div>
            {paused.map((t) => <DownloadItem key={t.id} task={t} />)}
          </section>
        )}

        {errored.length > 0 && (
          <section>
            <div className="px-4 py-1.5 text-xs font-semibold text-[#F43F5E] uppercase tracking-wider bg-[#0F0F23] sticky top-0">
              出错
            </div>
            {errored.map((t) => <DownloadItem key={t.id} task={t} />)}
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <div className="px-4 py-1.5 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider bg-[#0F0F23] sticky top-0">
              已完成
            </div>
            {completed.map((t) => <DownloadItem key={t.id} task={t} />)}
          </section>
        )}
      </div>
    </div>
  )
}
