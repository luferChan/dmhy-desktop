import React from 'react'
import { Star } from 'lucide-react'
import { useSearchStore } from '../store'

interface Props {
  activeTeamId: string | null
  activeTeamName: string | null
  onSelectTeam: (teamId: string, name: string) => void
}

export default function PublisherFilter({
  activeTeamId,
  onSelectTeam
}: Props): React.JSX.Element | null {
  const { favoritePublishers, toggleFavoritePublisher, publisherSnapshot } = useSearchStore()

  if (publisherSnapshot.length === 0) return null

  const publishers = [...publisherSnapshot].sort((a, b) => {
    const aFav = favoritePublishers.includes(a[0]) ? 1 : 0
    const bFav = favoritePublishers.includes(b[0]) ? 1 : 0
    if (aFav !== bFav) return bFav - aFav
    return b[1].count - a[1].count
  })

  return (
    <div className="flex flex-wrap items-center gap-2 px-8 py-2 border-b border-[#efeee9]">
      <span className="text-[10px] font-bold text-[#7a7b76] uppercase tracking-wider shrink-0">字幕组</span>
      <div className="flex flex-wrap gap-1.5">
        {publishers.map(([name, { teamId, count }]) => {
          const isSelected = activeTeamId === teamId
          const isFav = favoritePublishers.includes(name)

          return (
            <div key={name} className="flex items-center gap-0.5">
              <button
                onClick={() => onSelectTeam(teamId, name)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'bg-[#526446] text-white shadow-sm'
                    : 'bg-[#f5f4ef] text-[#5e605b] hover:bg-[#e9e8e3] hover:text-[#31332f]'
                  }`}
              >
                {isFav && <Star size={9} className="fill-current text-[#c67c2a]" />}
                {name}
                <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#b2b2ad]'}`}>
                  {count}
                </span>
              </button>
              <button
                onClick={() => toggleFavoritePublisher(name)}
                title={isFav ? '取消收藏' : '收藏字幕组'}
                className={`p-0.5 rounded-full transition-colors duration-150 cursor-pointer
                  ${isFav ? 'text-[#c67c2a]' : 'text-[#b2b2ad] hover:text-[#7a7b76]'}`}
              >
                <Star size={9} className={isFav ? 'fill-current' : ''} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
