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
      {/* 粘性顶栏 */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-8 h-16 bg-[#fbf9f5]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-headline text-lg font-bold text-[#526446]">下载管理</h2>
          {taskList.length > 0 && (
            <span className="text-xs text-[#7a7b76] font-medium">
              {active.length > 0 && `${active.length} 进行中`}
              {paused.length > 0 && ` · ${paused.length} 已暂停`}
              {completed.length > 0 && ` · ${completed.length} 已完成`}
            </span>
          )}
        </div>
        <Download size={18} className="text-[#b2b2ad]" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {taskList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[#b2b2ad] gap-3">
            <Inbox size={44} className="opacity-30" />
            <p className="text-sm font-medium">暂无下载任务</p>
            <p className="text-xs">在搜索页面点击下载按钮添加任务</p>
          </div>
        )}

        {/* 任务列表容器 */}
        {taskList.length > 0 && (
          <div className="mx-6 mt-2 mb-8 bg-white rounded-2xl overflow-hidden shadow-[0_4px_40px_-8px_rgba(49,51,47,0.06)] border border-[#b2b2ad]/10">
            {/* 表头 */}
            <div className="flex items-center px-6 py-3 bg-[#f5f4ef]/50">
              <div className="flex-1 min-w-0 text-[10px] font-bold text-[#7a7b76] uppercase tracking-widest">文件名</div>
              <div className="w-20 text-right text-[10px] font-bold text-[#7a7b76] uppercase tracking-widest shrink-0">大小</div>
              <div className="w-28 text-right text-[10px] font-bold text-[#7a7b76] uppercase tracking-widest shrink-0">状态</div>
              <div className="w-16 shrink-0" />
            </div>

            {active.length > 0 && (
              <>
                {active.length > 0 && errored.length + paused.length + completed.length > 0 && (
                  <div className="px-6 py-1.5 bg-[#d4e9c3]/30">
                    <span className="text-[10px] font-bold text-[#45573a] uppercase tracking-wider">进行中</span>
                  </div>
                )}
                {active.map((t) => <DownloadItem key={t.id} task={t} />)}
              </>
            )}

            {errored.length > 0 && (
              <>
                <div className="px-6 py-1.5 bg-[#a73b21]/5">
                  <span className="text-[10px] font-bold text-[#a73b21] uppercase tracking-wider">出错</span>
                </div>
                {errored.map((t) => <DownloadItem key={t.id} task={t} />)}
              </>
            )}

            {paused.length > 0 && (
              <>
                <div className="px-6 py-1.5 bg-[#fadec1]/40">
                  <span className="text-[10px] font-bold text-[#614e39] uppercase tracking-wider">已暂停</span>
                </div>
                {paused.map((t) => <DownloadItem key={t.id} task={t} />)}
              </>
            )}

            {completed.length > 0 && (
              <>
                <div className="px-6 py-1.5 bg-[#efeee9]/60">
                  <span className="text-[10px] font-bold text-[#5e605b] uppercase tracking-wider">已完成</span>
                </div>
                {completed.map((t) => <DownloadItem key={t.id} task={t} />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
