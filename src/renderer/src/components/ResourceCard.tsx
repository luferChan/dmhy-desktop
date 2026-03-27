import React from 'react'
import { useState } from 'react'
import { Copy, Download, ExternalLink, Check, Clock, HardDrive, User } from 'lucide-react'
import type { Resource } from '../types'

interface Props {
  resource: Resource
  onDownload: (url: string, title: string, size: string, detailUrl: string) => void
}

export default function ResourceCard({ resource, onDownload }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [loadingMagnet, setLoadingMagnet] = useState(false)
  const [magnet, setMagnet] = useState(resource.magnetUrl || '')

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
    // Prefer torrent URL: HTTP download resolves metadata in <1s vs 30s+ DHT for magnet
    if (resource.torrentUrl) {
      onDownload(resource.torrentUrl, resource.title, resource.size, resource.detailUrl)
      return
    }
    const url = await ensureMagnet()
    if (!url) return
    onDownload(url, resource.title, resource.size, resource.detailUrl)
  }

  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-[#2a2a4a] hover:bg-[#16162a] transition-colors duration-150 cursor-default">
      {/* Category tag */}
      {resource.category && (
        <span className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#7C3AED22] text-[#A78BFA] border border-[#7C3AED44] whitespace-nowrap">
          {resource.category}
        </span>
      )}

      {/* Title & meta */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-[#E2E8F0] leading-snug line-clamp-2 cursor-pointer hover:text-[#A78BFA] transition-colors duration-150"
          onClick={() => window.api.openExternal(resource.detailUrl)}
          title={resource.title}
        >
          {resource.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-[#94A3B8]">
          {resource.publisher && (
            <span className="flex items-center gap-1">
              <User size={11} />
              {resource.publisher}
            </span>
          )}
          {resource.publishTime && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {resource.publishTime}
            </span>
          )}
          {resource.size && (
            <span className="flex items-center gap-1">
              <HardDrive size={11} />
              {resource.size}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={handleCopy}
          disabled={loadingMagnet}
          title="复制磁力链接"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#A78BFA] transition-all duration-150 cursor-pointer disabled:opacity-40"
        >
          {copied ? <Check size={15} className="text-[#10B981]" /> : <Copy size={15} />}
        </button>
        <button
          onClick={() => window.api.openExternal(resource.detailUrl)}
          title="在浏览器中打开"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#A78BFA] transition-all duration-150 cursor-pointer"
        >
          <ExternalLink size={15} />
        </button>
        <button
          onClick={handleDownload}
          disabled={loadingMagnet || !magnet && resource.magnetUrl === ''}
          title="开始下载"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C3AED22] text-[#A78BFA] hover:bg-[#7C3AED] hover:text-white transition-all duration-150 cursor-pointer disabled:opacity-40"
        >
          <Download size={15} />
        </button>
      </div>
    </div>
  )
}
