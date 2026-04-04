import React, { useState } from 'react'
import { Folder, FolderOpen, Leaf } from 'lucide-react'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#31332f]/20 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[400px] rounded-2xl bg-white/95 backdrop-blur-xl border border-[#b2b2ad]/20 shadow-[0_40px_60px_-15px_rgba(49,51,47,0.12)] p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#d4e9c3] flex items-center justify-center shrink-0">
            <Folder size={16} className="text-[#526446]" />
          </div>
          <div>
            <h3 className="font-headline text-sm font-bold text-[#31332f]">选择下载目录</h3>
            <p className="text-[11px] text-[#7a7b76] mt-0.5">确认后开始下载</p>
          </div>
        </div>

        {/* 路径展示 */}
        <div className="flex items-center gap-2 bg-[#f5f4ef] rounded-xl px-4 py-2.5">
          <FolderOpen size={13} className="text-[#526446] shrink-0" />
          <span className="flex-1 text-xs text-[#5e605b] truncate" title={path}>
            {truncatePath(path)}
          </span>
          <button
            onClick={handleChangePath}
            className="text-xs font-semibold text-[#526446] hover:text-[#47583b] transition-colors duration-150 shrink-0 cursor-pointer"
          >
            更换目录
          </button>
        </div>

        {/* 7天不再询问 */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={suppress}
            onChange={(e) => setSuppress(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#526446] cursor-pointer rounded"
          />
          <span className="text-xs text-[#5e605b]">7天内不再询问</span>
        </label>

        {/* 提示 */}
        <div className="flex items-center gap-2 p-3 bg-[#f6fed3]/50 rounded-xl">
          <Leaf size={13} className="text-[#5b6242] shrink-0" />
          <p className="text-[11px] text-[#5b6242]">下载完成后可在「下载管理」中找到文件。</p>
        </div>

        {/* 按钮 */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-sm text-[#5e605b] hover:text-[#31332f] hover:bg-[#f5f4ef] transition-colors duration-150 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(path, suppress)}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-[#526446] text-white hover:bg-[#47583b] transition-colors duration-200 cursor-pointer shadow-sm"
          >
            开始下载
          </button>
        </div>
      </div>
    </div>
  )
}
