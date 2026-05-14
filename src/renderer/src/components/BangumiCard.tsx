import React, { useState } from 'react'
import { Tv2, Clock } from 'lucide-react'
import type { Bangumi } from '../types'

interface Props {
  bangumi: Bangumi
  onSelect: (bangumi: Bangumi) => void
}

export default function BangumiCard({ bangumi, onSelect }: Props): React.JSX.Element {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <button
      onClick={() => onSelect(bangumi)}
      className="group flex flex-col bg-white rounded-xl border border-[#b2b2ad]/10 overflow-hidden hover:shadow-[0_4px_20px_-4px_rgba(82,100,70,0.10)] transition-all duration-300 cursor-pointer text-left"
    >
      <div className="relative w-full aspect-[3/4] bg-[#f5f4ef] flex items-center justify-center overflow-hidden">
        {bangumi.poster && !imgFailed ? (
          <img
            src={bangumi.poster}
            alt={bangumi.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <Tv2 size={28} className="text-[#b2b2ad]" />
        )}
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <p
          className="font-headline text-[12px] font-bold text-[#31332f] leading-snug line-clamp-2"
          title={bangumi.name}
        >
          {bangumi.name}
        </p>
        {bangumi.lastUpdate && (
          <span className="flex items-center gap-1 text-[10px] text-[#7a7b76]">
            <Clock size={9} />
            {bangumi.lastUpdate}
          </span>
        )}
      </div>
    </button>
  )
}
