import React from 'react'
import { useState } from 'react'
import { Copy, Download, ExternalLink, Check, Clock, HardDrive, User } from 'lucide-react'
import type { Resource } from '../types'
import { useSearchStore } from '../store'

interface Props {
  resource: Resource
  onDownload: (url: string, title: string, size: string, detailUrl: string) => void
}

const CATEGORY_TEXT: Record<string, string> = {
  動畫: 'text-[#45573a]',
  漫畫: 'text-[#614e39]',
  音樂: 'text-[#495031]',
  日劇: 'text-[#7c4028]',
  遊戲: 'text-[#5e3d6e]',
  其他: 'text-[#5e605b]'
}

function getCategoryText(cat: string): string {
  for (const [key, text] of Object.entries(CATEGORY_TEXT)) {
    if (cat.includes(key)) return text
  }
  return CATEGORY_TEXT['其他']
}

export default function ResourceCard({ resource, onDownload }: Props): React.JSX.Element {
  const source = useSearchStore((s) => s.source)
  const [copied, setCopied] = useState(false)
  const [loadingMagnet, setLoadingMagnet] = useState(false)
  const [magnet, setMagnet] = useState(resource.magnetUrl || '')

  const categoryText = resource.category
    ? getCategoryText(resource.category)
    : CATEGORY_TEXT['其他']

  async function ensureMagnet(): Promise<string> {
    if (magnet) return magnet
    setLoadingMagnet(true)
    try {
      const url = await window.api.getMagnet(source, resource.detailUrl)
      setMagnet(url)
      return url
    } finally {
      setLoadingMagnet(false)
    }
  }

  async function handleCopy(): Promise<void> {
    const url = await ensureMagnet()
    if (!url) return
    await window.api.copyText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownload(): Promise<void> {
    if (resource.torrentUrl) {
      onDownload(resource.torrentUrl, resource.title, resource.size, resource.detailUrl)
      return
    }
    const url = await ensureMagnet()
    if (!url) return
    onDownload(url, resource.title, resource.size, resource.detailUrl)
  }

  return (
    <div className="group bg-white rounded-lg border border-[#b2b2ad]/10 px-3.5 py-2.5 flex items-center gap-3 hover:shadow-[0_4px_20px_-4px_rgba(82,100,70,0.10)] transition-all duration-300">
      {/* 左侧：标题 + 元信息 */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="relative group/title">
          <p
            className="font-headline text-[13px] font-bold text-[#31332f] leading-snug line-clamp-1 cursor-pointer hover:text-[#526446] transition-colors duration-150"
            onClick={() => window.api.openExternal(resource.detailUrl)}
          >
            {resource.title}
          </p>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full mt-1 z-30 max-w-[28rem] px-3 py-2 bg-[#31332f] text-[#f5f4ef] text-[13px] leading-relaxed antialiased rounded-md shadow-lg whitespace-normal break-words opacity-0 group-hover/title:opacity-100 transition-opacity duration-150"
          >
            {resource.title}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-[#7a7b76] flex-wrap">
          {resource.publisher && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {resource.publisher}
            </span>
          )}
          {resource.publishTime && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {resource.publishTime}
            </span>
          )}
          {resource.size && (
            <span className="flex items-center gap-1">
              <HardDrive size={10} />
              {resource.size}
            </span>
          )}
          {resource.category && (
            <span className={`text-[10px] font-bold uppercase tracking-wide ${categoryText}`}>
              # {resource.category}
            </span>
          )}
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={handleCopy}
          disabled={loadingMagnet}
          title="复制磁力链接"
          className="flex items-center justify-center w-7 h-7 rounded-full text-[#7a7b76] opacity-0 group-hover:opacity-100 hover:bg-[#f5f4ef] hover:text-[#526446] transition-all duration-150 cursor-pointer disabled:opacity-40"
        >
          {copied ? <Check size={13} className="text-[#526446]" /> : <Copy size={13} />}
        </button>
        <button
          onClick={() => window.api.openExternal(resource.detailUrl)}
          title="在浏览器中打开"
          className="flex items-center justify-center w-7 h-7 rounded-full text-[#7a7b76] opacity-0 group-hover:opacity-100 hover:bg-[#f5f4ef] hover:text-[#526446] transition-all duration-150 cursor-pointer"
        >
          <ExternalLink size={13} />
        </button>
        <button
          onClick={handleDownload}
          disabled={loadingMagnet || (!magnet && resource.magnetUrl === '')}
          title="开始下载"
          className="flex items-center gap-1 text-[11px] font-bold text-[#526446] bg-[#526446]/10 px-2.5 py-1 rounded-full hover:bg-[#526446] hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-40 ml-1"
        >
          <Download size={12} />
          下载
        </button>
      </div>
    </div>
  )
}
