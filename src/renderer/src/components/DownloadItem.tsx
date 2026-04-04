import React from 'react'
import { Pause, Play, Trash2, FolderOpen, AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'
import type { DownloadTask } from '../types'

interface Props {
  task: DownloadTask
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return ''
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function DownloadItem({ task }: Props): React.JSX.Element {
  const isActive = task.status === 'downloading'
  const isSeeding = task.status === 'seeding'
  const isPaused = task.status === 'paused'
  const isCompleted = task.status === 'completed'
  const isError = task.status === 'error'
  const isWaiting = task.status === 'waiting'

  return (
    <div className="group flex items-center px-6 py-4 border-b border-[#efeee9] last:border-0 hover:bg-[#f5f4ef]/40 transition-colors duration-150">
      {/* 状态图标 */}
      <div className="w-5 shrink-0 mr-3 flex items-center justify-center">
        {isCompleted && <CheckCircle2 size={16} className="text-[#526446]" />}
        {isError && <AlertCircle size={16} className="text-[#a73b21]" />}
        {isWaiting && <Loader2 size={16} className="text-[#b2b2ad] animate-spin" />}
        {isActive && <div className="w-4 h-4 rounded-full border-2 border-[#526446] border-t-transparent animate-spin" />}
        {isSeeding && <Upload size={16} className="text-[#5b6242]" />}
        {isPaused && <Pause size={16} className="text-[#b2b2ad]" />}
      </div>

      {/* 名称 + 进度 */}
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-[#31332f] truncate" title={task.name}>
          {task.name}
        </p>

        {/* 进度条 (仅活跃下载) */}
        {(isActive || isWaiting) && (
          <div className="mt-1.5">
            <div className="h-1 bg-[#efeee9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#526446] transition-all duration-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-[#7a7b76]">
              <span>{formatBytes(task.downloaded)} / {task.total > 0 ? formatBytes(task.total) : '?'}</span>
              <span className="flex items-center gap-2">
                {isActive && task.downloadSpeed > 0 && (
                  <span className="text-[#526446] font-medium">{formatSpeed(task.downloadSpeed)}</span>
                )}
                {isActive && task.eta > 0 && <span>{formatEta(task.eta)}</span>}
                <span className="font-medium">{task.progress}%</span>
              </span>
            </div>
          </div>
        )}

        {/* 做种信息 */}
        {isSeeding && (
          <p className="mt-1 text-[11px] text-[#5b6242]">
            做种中
            {task.uploadSpeed > 0 && <span className="ml-1 font-medium">{formatSpeed(task.uploadSpeed)}</span>}
          </p>
        )}

        {/* 完成信息 */}
        {isCompleted && task.startedAt && task.completedAt && (
          <p className="mt-1 text-[11px] text-[#b2b2ad]">
            耗时 {formatEta(Math.round((task.completedAt - task.startedAt) / 1000))}
          </p>
        )}

        {/* 错误信息 */}
        {isError && (
          <p className="mt-1 text-[11px] text-[#a73b21]">{task.error || '下载出错'}</p>
        )}
      </div>

      {/* 文件大小 */}
      <div className="w-20 text-right text-xs text-[#7a7b76] shrink-0">
        {task.total > 0 ? formatBytes(task.total) : '—'}
      </div>

      {/* 状态标签 */}
      <div className="w-24 flex justify-end shrink-0 mr-2">
        {isActive && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d4e9c3] text-[#45573a] text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#526446] animate-pulse" />
            下载中 {task.progress}%
          </span>
        )}
        {isWaiting && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f5f4ef] text-[#7a7b76] text-[10px] font-bold">
            等待中
          </span>
        )}
        {isPaused && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fadec1] text-[#614e39] text-[10px] font-bold">
            已暂停
          </span>
        )}
        {isSeeding && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f6fed3] text-[#495031] text-[10px] font-bold">
            做种中
          </span>
        )}
        {isCompleted && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e9e8e3] text-[#5e605b] text-[10px] font-bold">
            已完成
          </span>
        )}
        {isError && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#a73b21]/10 text-[#a73b21] text-[10px] font-bold">
            下载失败
          </span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 w-16 justify-end shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {isCompleted && (
          <button
            onClick={() => window.api.openPath(task.savePath)}
            title="打开文件夹"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#7a7b76] hover:bg-[#d4e9c3] hover:text-[#526446] transition-all duration-150 cursor-pointer"
          >
            <FolderOpen size={13} />
          </button>
        )}
        {isActive && (
          <button
            onClick={() => window.api.downloadPause(task.id)}
            title="暂停"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#7a7b76] hover:bg-[#e9e8e3] hover:text-[#31332f] transition-all duration-150 cursor-pointer"
          >
            <Pause size={13} />
          </button>
        )}
        {isPaused && (
          <button
            onClick={() => window.api.downloadResume(task.id)}
            title="继续"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#7a7b76] hover:bg-[#d4e9c3] hover:text-[#526446] transition-all duration-150 cursor-pointer"
          >
            <Play size={13} />
          </button>
        )}
        <button
          onClick={() => window.api.downloadRemove(task.id, task.status !== 'completed')}
          title="删除任务"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-[#7a7b76] hover:bg-[#a73b21]/10 hover:text-[#a73b21] transition-all duration-150 cursor-pointer"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
