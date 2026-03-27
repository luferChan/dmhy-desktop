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

const STATUS_COLORS: Record<DownloadTask['status'], string> = {
  downloading: '#10B981',
  waiting: '#F59E0B',
  paused: '#94A3B8',
  completed: '#10B981',
  error: '#F43F5E',
  seeding: '#A78BFA'
}

export default function DownloadItem({ task }: Props): React.JSX.Element {
  const isActive = task.status === 'downloading'
  const isSeeding = task.status === 'seeding'
  const isPaused = task.status === 'paused'
  const isCompleted = task.status === 'completed'
  const isError = task.status === 'error'
  const isWaiting = task.status === 'waiting'

  const statusColor = STATUS_COLORS[task.status]

  return (
    <div className="px-4 py-3 border-b border-[#2a2a4a] hover:bg-[#16162a] transition-colors duration-150">
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2">
        <div className="shrink-0 mt-0.5">
          {isCompleted && <CheckCircle2 size={16} className="text-[#10B981]" />}
          {isError && <AlertCircle size={16} className="text-[#F43F5E]" />}
          {isWaiting && <Loader2 size={16} className="text-[#F59E0B] animate-spin" />}
          {isActive && (
            <div className="w-4 h-4 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
          )}
          {isSeeding && <Upload size={16} className="text-[#A78BFA]" />}
          {isPaused && <Pause size={16} className="text-[#94A3B8]" />}
        </div>

        <p className="flex-1 text-sm text-[#E2E8F0] leading-snug line-clamp-1" title={task.name}>
          {task.name}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {isCompleted && (
            <button
              onClick={() => window.api.openPath(task.savePath)}
              title="打开文件夹"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#A78BFA] transition-all duration-150 cursor-pointer"
            >
              <FolderOpen size={14} />
            </button>
          )}
          {isActive && (
            <button
              onClick={() => window.api.downloadPause(task.id)}
              title="暂停"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#E2E8F0] transition-all duration-150 cursor-pointer"
            >
              <Pause size={14} />
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => window.api.downloadResume(task.id)}
              title="继续"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#10B981] transition-all duration-150 cursor-pointer"
            >
              <Play size={14} />
            </button>
          )}
          <button
            onClick={() => window.api.downloadRemove(task.id, task.status !== 'completed')}
            title="删除任务"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#F43F5E] transition-all duration-150 cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!isCompleted && !isError && !isSeeding && (
        <div className="ml-6">
          <div className="h-1.5 bg-[#2a2a4a] rounded-full overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${task.progress}%`,
                backgroundColor: statusColor
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>
              {formatBytes(task.downloaded)} / {task.total > 0 ? formatBytes(task.total) : '?'}
            </span>
            <span className="flex items-center gap-2">
              {isActive && task.downloadSpeed > 0 && (
                <span className="text-[#10B981]">{formatSpeed(task.downloadSpeed)}</span>
              )}
              {isActive && task.eta > 0 && (
                <span className="text-[#64748B]">{formatEta(task.eta)}</span>
              )}
              <span style={{ color: statusColor }}>{task.progress}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Seeding info */}
      {isSeeding && (
        <p className="ml-6 text-xs text-[#94A3B8]">
          做种中
          {task.uploadSpeed > 0 && (
            <span className="text-[#A78BFA] ml-2">{formatSpeed(task.uploadSpeed)}</span>
          )}
          <span className="ml-2">{formatBytes(task.total)}</span>
        </p>
      )}

      {isCompleted && (
        <p className="ml-6 text-xs text-[#94A3B8]">
          {formatBytes(task.total)} · {task.savePath}
        </p>
      )}

      {isError && (
        <p className="ml-6 text-xs text-[#F43F5E]">{task.error || '下载出错'}</p>
      )}
    </div>
  )
}
