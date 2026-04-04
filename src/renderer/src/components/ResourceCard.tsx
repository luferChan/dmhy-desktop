import React from 'react'
import { useState } from 'react'
import { Copy, Download, ExternalLink, Check, Clock, HardDrive, User } from 'lucide-react'
import type { Resource } from '../types'

interface Props {
  resource: Resource
  onDownload: (url: string, title: string, size: string, detailUrl: string) => void
}

type CategoryStyle = { bg: string; text: string; iconBg: string }

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  '動畫': { bg: 'bg-[#d4e9c3]', text: 'text-[#45573a]', iconBg: 'bg-[#d4e9c3]' },
  '漫畫': { bg: 'bg-[#fadec1]', text: 'text-[#614e39]', iconBg: 'bg-[#fadec1]' },
  '音樂': { bg: 'bg-[#f6fed3]', text: 'text-[#495031]', iconBg: 'bg-[#f6fed3]' },
  '日劇': { bg: 'bg-[#fde8d8]', text: 'text-[#7c4028]', iconBg: 'bg-[#fde8d8]' },
  '遊戲': { bg: 'bg-[#e8d4e9]', text: 'text-[#5e3d6e]', iconBg: 'bg-[#e8d4e9]' },
  '其他': { bg: 'bg-[#e9e8e3]', text: 'text-[#5e605b]', iconBg: 'bg-[#e9e8e3]' },
}

function getCategoryStyle(cat: string): CategoryStyle {
  for (const [key, style] of Object.entries(CATEGORY_STYLES)) {
    if (cat.includes(key)) return style
  }
  return CATEGORY_STYLES['其他']
}

export default function ResourceCard({ resource, onDownload }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [loadingMagnet, setLoadingMagnet] = useState(false)
  const [magnet, setMagnet] = useState(resource.magnetUrl || '')

  const style = resource.category ? getCategoryStyle(resource.category) : CATEGORY_STYLES['其他']

  async function ensureMagnet(): Promise<string> {
    if (magnet) return magnet
    setLoadingMagnet(true)
    try {
      const url = await window.api.getMagnet(resource.detailUrl)
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
    <div className="group bg-white rounded-xl border border-[#b2b2ad]/10 p-4 flex flex-col gap-3 hover:shadow-[0_4px_20px_-4px_rgba(82,100,70,0.10)] transition-all duration-300 cursor-default">
      {/* 顶部：图标 + 操作按钮 */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center shrink-0`}>
          <Download size={16} className={style.text} />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={handleCopy}
            disabled={loadingMagnet}
            title="复制磁力链接"
            className="flex items-center justify-center w-7 h-7 rounded-full text-[#7a7b76] hover:bg-[#f5f4ef] hover:text-[#526446] transition-all duration-150 cursor-pointer disabled:opacity-40"
          >
            {copied ? <Check size={13} className="text-[#526446]" /> : <Copy size={13} />}
          </button>
          <button
            onClick={() => window.api.openExternal(resource.detailUrl)}
            title="在浏览器中打开"
            className="flex items-center justify-center w-7 h-7 rounded-full text-[#7a7b76] hover:bg-[#f5f4ef] hover:text-[#526446] transition-all duration-150 cursor-pointer"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* 标题 */}
      <div className="flex-1 min-w-0">
        <p
          className="font-headline text-[13px] font-bold text-[#31332f] leading-snug line-clamp-2 cursor-pointer hover:text-[#526446] transition-colors duration-150"
          onClick={() => window.api.openExternal(resource.detailUrl)}
          title={resource.title}
        >
          {resource.title}
        </p>
      </div>

      {/* 底部：元信息 + 分类 + 下载 */}
      <div className="flex items-end justify-between pt-2 border-t border-[#efeee9]">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-[#7a7b76] flex-wrap">
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
          </div>
          {resource.size && (
            <span className="flex items-center gap-1 text-[11px] text-[#7a7b76]">
              <HardDrive size={10} />
              {resource.size}
            </span>
          )}
          {resource.category && (
            <span className={`inline-flex w-fit text-[10px] font-bold uppercase tracking-wide ${style.text} mt-1`}>
              # {resource.category}
            </span>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={loadingMagnet || (!magnet && resource.magnetUrl === '')}
          title="开始下载"
          className="flex items-center gap-1 text-[11px] font-bold text-[#526446] bg-[#526446]/10 px-2.5 py-1 rounded-full hover:bg-[#526446] hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-40 shrink-0 ml-2"
        >
          <Download size={12} />
          下载
        </button>
      </div>
    </div>
  )
}
