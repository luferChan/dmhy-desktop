import React from 'react'
import { Star } from 'lucide-react'
import { useSearchStore } from '../store'
import type { Resource } from '../types'

interface Props {
  resources: Resource[]
  activeTeamId: string | null
  activeTeamName: string | null
  onSelectTeam: (teamId: string, name: string) => void
}

export default function PublisherFilter({
  resources,
  activeTeamId,
  onSelectTeam
}: Props): React.JSX.Element | null {
  const { favoritePublishers, toggleFavoritePublisher } = useSearchStore()

  // Build publisher map: name → teamId, count
  const publisherMap = new Map<string, { teamId: string; count: number }>()
  for (const r of resources) {
    if (r.publisher && r.teamId) {
      const existing = publisherMap.get(r.publisher)
      if (existing) existing.count++
      else publisherMap.set(r.publisher, { teamId: r.teamId, count: 1 })
    }
  }

  if (publisherMap.size === 0) return null

  // Sort: favorites first, then by count
  const publishers = Array.from(publisherMap.entries()).sort((a, b) => {
    const aFav = favoritePublishers.includes(a[0]) ? 1 : 0
    const bFav = favoritePublishers.includes(b[0]) ? 1 : 0
    if (aFav !== bFav) return bFav - aFav
    return b[1].count - a[1].count
  })

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#2a2a4a]">
      <span className="text-xs text-[#94A3B8] shrink-0">字幕组</span>

      <div className="flex flex-wrap gap-1.5">
        {publishers.map(([name, { teamId, count }]) => {
          const isSelected = activeTeamId === teamId
          const isFav = favoritePublishers.includes(name)

          return (
            <div key={name} className="flex items-center gap-0.5">
              <button
                onClick={() => onSelectTeam(teamId, name)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border
                  ${
                    isSelected
                      ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-sm shadow-[#7C3AED44]'
                      : 'bg-transparent border-[#2a2a4a] text-[#94A3B8] hover:border-[#7C3AED88] hover:text-[#E2E8F0]'
                  }`}
              >
                {isFav && <Star size={10} className="fill-current text-[#F59E0B]" />}
                {name}
                <span className={`text-[10px] ${isSelected ? 'text-[#c4b5fd]' : 'text-[#475569]'}`}>
                  {count}
                </span>
              </button>
              <button
                onClick={() => toggleFavoritePublisher(name)}
                title={isFav ? '取消收藏' : '收藏字幕组'}
                className={`p-0.5 rounded transition-colors duration-150 cursor-pointer
                  ${isFav ? 'text-[#F59E0B]' : 'text-[#475569] hover:text-[#94A3B8]'}`}
              >
                <Star size={10} className={isFav ? 'fill-current' : ''} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
