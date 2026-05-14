import React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Loader2, AlertCircle, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react'
import { useSearchStore, useDownloadStore, useUIStore } from '../store'
import ResourceCard from '../components/ResourceCard'
import PublisherFilter from '../components/PublisherFilter'
import DownloadPathPicker from '../components/DownloadPathPicker'
import BangumiCard from '../components/BangumiCard'
import { CATEGORIES, SEARCH_SOURCES, type SearchSource, type Bangumi } from '../types'

function pickInitialDayOfWeek(sections: { dayOfWeek: string }[]): string | null {
  if (sections.length === 0) return null
  const today = String(new Date().getDay()) // 0=Sun..6=Sat — matches Mikan
  if (sections.some((s) => s.dayOfWeek === today)) return today
  return sections[0].dayOfWeek
}

export default function SearchPage(): React.JSX.Element {
  const {
    source,
    keyword,
    results,
    page,
    hasMore,
    loading,
    error,
    activeTeamId,
    activeTeamName,
    publisherSnapshot,
    mikanView,
    schedule,
    activeDayOfWeek,
    activeBangumi,
    bangumiResources,
    setSource,
    setKeyword,
    setResults,
    setLoading,
    setError,
    setTeamFilter,
    clearTeamFilter,
    updatePublisherSnapshot,
    setMikanView,
    setSchedule,
    setActiveDayOfWeek,
    setActiveBangumi,
    setBangumiResources
  } = useSearchStore()
  useDownloadStore()
  const { setPage } = useUIStore()
  const [inputValue, setInputValue] = useState(keyword)
  const [selectedCategory, setSelectedCategory] = useState(2)
  const [pickerState, setPickerState] = useState<{
    url: string
    title: string
    size: string
    detailUrl: string
    path: string
    deleteTorrent: boolean
  } | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(
    async (
      src: SearchSource,
      kw: string,
      p: number,
      sid: number,
      teamId?: string,
      append = false
    ) => {
      setLoading(true)
      setError(null)
      try {
        const res = await window.api.search(src, kw, p, sid, teamId)
        setResults(res.resources, res.page, res.hasMore, append)
        if (!teamId) {
          updatePublisherSnapshot(res.resources, append)
        }
      } catch (e: unknown) {
        setError((e as Error).message || '搜索失败，请重试')
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setResults, updatePublisherSnapshot]
  )

  const loadSchedule = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const sections = await window.api.getMikanSchedule()
      setSchedule(sections)
      setActiveDayOfWeek(pickInitialDayOfWeek(sections))
    } catch (e: unknown) {
      setError((e as Error).message || '加载番组周表失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setSchedule, setActiveDayOfWeek])

  const loadBangumi = useCallback(
    async (bangumi: Bangumi): Promise<void> => {
      setActiveBangumi(bangumi)
      setBangumiResources([])
      clearTeamFilter()
      setMikanView('bangumi')
      setLoading(true)
      setError(null)
      try {
        const { resources } = await window.api.getMikanBangumi(bangumi.id)
        setBangumiResources(resources)
        updatePublisherSnapshot(resources, false)
      } catch (e: unknown) {
        setError((e as Error).message || '加载番剧资源失败，请重试')
      } finally {
        setLoading(false)
      }
    },
    [
      setActiveBangumi,
      setBangumiResources,
      clearTeamFilter,
      setMikanView,
      setLoading,
      setError,
      updatePublisherSnapshot
    ]
  )

  useEffect(() => {
    if (source === 'mikan') {
      if (mikanView === 'schedule' && schedule.length === 0) loadSchedule()
    } else if (results.length === 0) {
      doSearch(source, '', 1, selectedCategory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(): void {
    const kw = inputValue.trim()
    setKeyword(kw)
    clearTeamFilter()
    if (source === 'mikan' && !kw) {
      // Empty keyword on mikan → back to the schedule view instead of running a search.
      setMikanView('schedule')
      if (schedule.length === 0) loadSchedule()
      return
    }
    if (source === 'mikan') setMikanView('list')
    doSearch(source, kw, 1, selectedCategory)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') handleSearch()
  }

  function handleLoadMore(): void {
    doSearch(source, keyword, page + 1, selectedCategory, activeTeamId ?? undefined, true)
  }

  function handleCategoryChange(id: number): void {
    setSelectedCategory(id)
    clearTeamFilter()
    doSearch(source, keyword, 1, id)
  }

  function handleSourceChange(next: SearchSource): void {
    if (next === source) return
    setSource(next)
    clearTeamFilter()
    if (next === 'mikan') {
      setMikanView('schedule')
      if (schedule.length === 0) loadSchedule()
    } else {
      setMikanView('list')
      doSearch(next, keyword, 1, selectedCategory)
    }
  }

  function handleSelectBangumi(b: Bangumi): void {
    loadBangumi(b)
  }

  function handleBackToSchedule(): void {
    setMikanView('schedule')
    setActiveBangumi(null)
    setBangumiResources([])
    clearTeamFilter()
  }

  function handleTeamFilter(teamId: string, name: string): void {
    if (source === 'mikan') {
      // Mikan has no server-side team filter; toggle locally.
      if (activeTeamId === teamId) clearTeamFilter()
      else setTeamFilter(teamId, name)
      return
    }
    if (activeTeamId === teamId) {
      clearTeamFilter()
      doSearch(source, keyword, 1, selectedCategory)
    } else {
      setTeamFilter(teamId, name)
      doSearch(source, keyword, 1, selectedCategory, teamId)
    }
  }

  async function handleDownload(
    url: string,
    title: string,
    size: string,
    detailUrl: string
  ): Promise<void> {
    const settings = await window.api.settingsGet()
    const effectivePath = settings.lastUsedDownloadPath || settings.downloadPath
    const deleteTorrent = settings.deleteTorrentAfterComplete

    if (settings.suppressDownloadPickerUntil > Date.now()) {
      await window.api.downloadAdd(
        source,
        url,
        title,
        size,
        detailUrl,
        effectivePath,
        deleteTorrent
      )
      setPage('downloads')
      return
    }

    setPickerState({
      url,
      title,
      size,
      detailUrl,
      path: effectivePath,
      deleteTorrent
    })
  }

  function handleScroll(): void {
    if (scrollRef.current) {
      setShowBackToTop(scrollRef.current.scrollTop > 300)
    }
  }

  function scrollToTop(): void {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePickerConfirm(
    path: string,
    suppress: boolean,
    deleteTorrent: boolean
  ): Promise<void> {
    const settings = await window.api.settingsGet()
    await window.api.settingsSave({
      ...settings,
      lastUsedDownloadPath: path,
      suppressDownloadPickerUntil: suppress ? Date.now() + 7 * 24 * 60 * 60 * 1000 : 0,
      deleteTorrentAfterComplete: deleteTorrent
    })
    await window.api.downloadAdd(
      source,
      pickerState!.url,
      pickerState!.title,
      pickerState!.size,
      pickerState!.detailUrl,
      path,
      deleteTorrent
    )
    setPickerState(null)
    setPage('downloads')
  }

  const viewMode: 'schedule' | 'bangumi' | 'list' = source === 'mikan' ? mikanView : 'list'
  const activeSection = schedule.find((s) => s.dayOfWeek === activeDayOfWeek) || null
  const listSource = viewMode === 'bangumi' ? bangumiResources : results
  const filteredList = activeTeamId
    ? listSource.filter((r) => r.teamId === activeTeamId)
    : listSource

  return (
    <div className="flex flex-col h-full">
      {pickerState && (
        <DownloadPathPicker
          defaultPath={pickerState.path}
          defaultDeleteTorrent={pickerState.deleteTorrent}
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerState(null)}
        />
      )}

      {/* 粘性顶栏 */}
      <header className="drag-region sticky top-0 z-20 flex items-center justify-between px-8 h-16 bg-[#fbf9f5]/90 backdrop-blur-md shrink-0">
        <h2 className="font-headline text-lg font-bold text-[#526446]">资源检索</h2>
        <div className="no-drag flex items-center gap-3">
          <div className="flex items-center bg-[#f5f4ef] rounded-full p-0.5 shrink-0">
            {SEARCH_SOURCES.map((src) => (
              <button
                key={src.id}
                onClick={() => handleSourceChange(src.id)}
                disabled={loading}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed
                  ${
                    source === src.id
                      ? 'bg-[#526446] text-white shadow-sm'
                      : 'text-[#5e605b] hover:text-[#31332f]'
                  }`}
              >
                {src.label}
              </button>
            ))}
          </div>
          <div className="relative flex items-center bg-white border border-[#b2b2ad]/30 rounded-full px-4 py-2 focus-within:border-[#526446]/40 focus-within:shadow-[0_0_0_3px_rgba(82,100,70,0.08)] transition-all duration-200 w-64">
            <Search size={14} className="text-[#7a7b76] shrink-0 mr-2" />
            <input
              type="text"
              placeholder={source === 'mikan' ? '搜寻番剧...' : '搜寻番剧、漫画或音乐...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm text-[#31332f] placeholder-[#b2b2ad] outline-none"
            />
            {loading && <Loader2 size={13} className="text-[#526446] animate-spin ml-2 shrink-0" />}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-2 rounded-full bg-[#526446] text-white text-xs font-bold hover:bg-[#47583b] transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            搜索
          </button>
        </div>
      </header>

      {/* 分类筛选（仅动漫花园源支持） */}
      {source === 'dmhy' && (
        <div className="flex items-center gap-2 px-8 py-3 shrink-0 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer
                ${
                  selectedCategory === cat.id
                    ? 'bg-[#526446] text-white shadow-sm'
                    : 'bg-[#f5f4ef] text-[#5e605b] hover:bg-[#e9e8e3] hover:text-[#31332f]'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* 番组周表：星期 tab */}
      {viewMode === 'schedule' && schedule.length > 0 && (
        <div className="flex items-center gap-2 px-8 py-3 shrink-0 overflow-x-auto">
          {schedule.map((s) => (
            <button
              key={s.dayOfWeek}
              onClick={() => setActiveDayOfWeek(s.dayOfWeek)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer
                ${
                  activeDayOfWeek === s.dayOfWeek
                    ? 'bg-[#526446] text-white shadow-sm'
                    : 'bg-[#f5f4ef] text-[#5e605b] hover:bg-[#e9e8e3] hover:text-[#31332f]'
                }`}
            >
              {s.label}
              <span
                className={`ml-1.5 text-[10px] ${activeDayOfWeek === s.dayOfWeek ? 'text-white/70' : 'text-[#b2b2ad]'}`}
              >
                {s.bangumis.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 番剧详情：返回 + 标题 */}
      {viewMode === 'bangumi' && activeBangumi && (
        <div className="flex items-center gap-3 px-6 py-3 shrink-0 border-b border-[#efeee9]">
          <button
            onClick={handleBackToSchedule}
            className="flex items-center gap-1 text-xs font-semibold text-[#526446] hover:text-[#47583b] cursor-pointer"
          >
            <ChevronLeft size={14} />
            返回周表
          </button>
          <span className="text-xs text-[#b2b2ad]">·</span>
          <span
            className="font-headline text-sm font-bold text-[#31332f] truncate"
            title={activeBangumi.name}
          >
            {activeBangumi.name}
          </span>
        </div>
      )}

      {/* 字幕组筛选（仅列表与番剧详情视图） */}
      {viewMode !== 'schedule' && publisherSnapshot.length > 0 && (
        <PublisherFilter
          activeTeamId={activeTeamId}
          activeTeamName={activeTeamName}
          onSelectTeam={handleTeamFilter}
        />
      )}

      {/* 结果列表 */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-6 pt-2 pb-8"
        >
          {error && (
            <div className="flex items-center gap-2 mx-2 mb-4 p-3 rounded-xl bg-[#a73b21]/8 border border-[#a73b21]/20 text-sm text-[#a73b21]">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* 番组周表视图 */}
          {viewMode === 'schedule' && (
            <>
              {!loading && schedule.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-full text-[#b2b2ad] gap-3">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm">加载中...</p>
                </div>
              )}
              {activeSection && (
                <div className="grid grid-cols-4 gap-3">
                  {activeSection.bangumis.map((b) => (
                    <BangumiCard key={b.id} bangumi={b} onSelect={handleSelectBangumi} />
                  ))}
                </div>
              )}
              {activeSection && activeSection.bangumis.length === 0 && !loading && (
                <div className="flex items-center justify-center py-8 text-sm text-[#b2b2ad]">
                  今天暂无更新
                </div>
              )}
            </>
          )}

          {/* 列表视图（搜索结果 / 番剧详情） */}
          {viewMode !== 'schedule' && (
            <>
              {!loading && !error && filteredList.length === 0 && keyword && (
                <div className="flex flex-col items-center justify-center h-full text-[#b2b2ad] gap-3">
                  <Search size={40} className="opacity-30" />
                  <p className="text-sm">未找到相关资源</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {filteredList.map((r) => (
                  <ResourceCard key={r.id} resource={r} onDownload={handleDownload} />
                ))}
              </div>

              {activeTeamId && filteredList.length === 0 && !loading && (
                <div className="flex items-center justify-center py-8 text-sm text-[#b2b2ad]">
                  该字幕组暂无相关资源
                </div>
              )}

              {viewMode === 'list' && hasMore && !loading && (
                <button
                  onClick={handleLoadMore}
                  className="flex items-center justify-center gap-2 w-full py-4 mt-2 text-sm text-[#7a7b76] hover:text-[#31332f] hover:bg-[#f5f4ef] rounded-xl transition-colors duration-150 cursor-pointer"
                >
                  <ChevronDown size={15} />
                  加载更多
                </button>
              )}

              {loading && filteredList.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={18} className="text-[#526446] animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        {/* 回到顶部 */}
        <button
          onClick={scrollToTop}
          className={`absolute bottom-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-[#526446] text-white shadow-md transition-all duration-200 cursor-pointer hover:bg-[#47583b] hover:scale-105
          ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
        >
          <ChevronUp size={16} />
        </button>
      </div>

      {/* 状态栏 */}
      {(() => {
        const sourceLabel = SEARCH_SOURCES.find((s) => s.id === source)?.label
        if (viewMode === 'schedule' && activeSection) {
          return (
            <div className="px-8 py-2 text-[10px] text-[#b2b2ad] font-medium shrink-0 flex items-center justify-between border-t border-[#efeee9]">
              <span>
                {sourceLabel} · 番组周表 · {activeSection.label} · {activeSection.bangumis.length}{' '}
                部
              </span>
            </div>
          )
        }
        if (viewMode === 'bangumi' && activeBangumi) {
          return (
            <div className="px-8 py-2 text-[10px] text-[#b2b2ad] font-medium shrink-0 flex items-center justify-between border-t border-[#efeee9]">
              <span>
                {sourceLabel} · {activeBangumi.name} · {filteredList.length} 条
                {activeTeamName && ` · ${activeTeamName}`}
              </span>
            </div>
          )
        }
        if (viewMode === 'list' && results.length > 0) {
          return (
            <div className="px-8 py-2 text-[10px] text-[#b2b2ad] font-medium shrink-0 flex items-center justify-between border-t border-[#efeee9]">
              <span>
                {sourceLabel} · {keyword ? `"${keyword}" · ` : '最新发布 · '}
                {results.length} 条结果
                {activeTeamName && ` · ${activeTeamName}`}
              </span>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}
