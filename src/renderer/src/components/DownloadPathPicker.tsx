import React, { useState } from 'react'
import { Folder, FolderOpen } from 'lucide-react'

interface Props {
  defaultPath: string
  onConfirm: (path: string, suppress: boolean) => void
  onCancel: () => void
}

function truncatePath(p: string): string {
  const sep = p.includes('/') ? '/' : '\\'
  const parts = p.split(sep).filter(Boolean)
  if (parts.length <= 2) return p
  return sep + '...' + sep + parts.slice(-2).join(sep)
}

export default function DownloadPathPicker({ defaultPath, onConfirm, onCancel }: Props): React.JSX.Element {
  const [path, setPath] = useState(defaultPath)
  const [suppress, setSuppress] = useState(false)

  async function handleChangePath(): Promise<void> {
    const result = await window.api.selectFolder()
    if (result) setPath(result)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-[380px] rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <Folder size={18} className="text-[#A78BFA] shrink-0" />
          <span className="text-sm font-semibold text-[#E2E8F0]">选择下载目录</span>
        </div>

        {/* Path display */}
        <div className="flex items-center gap-2 bg-[#0F0F23] border border-[#2a2a4a] rounded-xl px-3 py-2">
          <FolderOpen size={14} className="text-[#7C3AED] shrink-0" />
          <span
            className="flex-1 text-xs text-[#94A3B8] truncate"
            title={path}
          >
            {truncatePath(path)}
          </span>
          <button
            onClick={handleChangePath}
            className="text-xs text-[#A78BFA] hover:text-[#E2E8F0] transition-colors duration-150 shrink-0 cursor-pointer"
          >
            更换目录
          </button>
        </div>

        {/* Suppress checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={suppress}
            onChange={(e) => setSuppress(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#7C3AED] cursor-pointer"
          />
          <span className="text-xs text-[#94A3B8]">7天内不再询问</span>
        </label>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#2a2a4a] transition-colors duration-150 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(path, suppress)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#7C3AED] text-white hover:bg-[#8B5CF6] transition-colors duration-150 cursor-pointer"
          >
            开始下载
          </button>
        </div>
      </div>
    </div>
  )
}
