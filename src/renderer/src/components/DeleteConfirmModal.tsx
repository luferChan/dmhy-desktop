import React, { useState } from 'react'
import { Trash2, AlertTriangle, Info } from 'lucide-react'

interface Props {
  taskName: string
  filesExist: boolean
  onConfirm: (deleteFiles: boolean) => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  taskName,
  filesExist,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const [deleteFiles, setDeleteFiles] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#31332f]/20 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[400px] rounded-2xl bg-white/95 backdrop-blur-xl border border-[#b2b2ad]/20 shadow-[0_40px_60px_-15px_rgba(49,51,47,0.12)] p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#a73b21]/10 flex items-center justify-center shrink-0">
            <Trash2 size={16} className="text-[#a73b21]" />
          </div>
          <div>
            <h3 className="font-headline text-sm font-bold text-[#31332f]">删除任务</h3>
            <p className="text-[11px] text-[#7a7b76] mt-0.5">此操作无法撤销</p>
          </div>
        </div>

        <div className="px-1">
          <p className="text-xs text-[#5e605b] leading-relaxed">
            确定要删除「<span className="font-semibold text-[#31332f]">{taskName}</span>」吗？
          </p>
        </div>

        {filesExist ? (
          <>
            <div className="flex flex-col gap-2 px-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#a73b21] cursor-pointer rounded"
                />
                <span className="text-xs text-[#5e605b]">同时删除已下载的文件</span>
              </label>
            </div>

            {deleteFiles && (
              <div className="flex items-center gap-2 p-3 bg-[#a73b21]/5 rounded-xl">
                <AlertTriangle size={13} className="text-[#a73b21] shrink-0" />
                <p className="text-[11px] text-[#a73b21]">源文件将被移至「废纸篓」/「回收站」。</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-[#f6fed3]/50 rounded-xl">
            <Info size={13} className="text-[#5b6242] shrink-0" />
            <p className="text-[11px] text-[#5b6242]">
              源文件已不在原下载位置（可能已被移动或删除），本次仅清理任务记录。
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-sm text-[#5e605b] hover:text-[#31332f] hover:bg-[#f5f4ef] transition-colors duration-150 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(filesExist ? deleteFiles : false)}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-[#a73b21] text-white hover:bg-[#8b2f1a] transition-colors duration-200 cursor-pointer shadow-sm"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
