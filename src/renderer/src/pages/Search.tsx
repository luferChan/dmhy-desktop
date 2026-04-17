import React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useSearchStore, useDownloadStore, useUIStore } from '../store'
import ResourceCard from '../components/ResourceCard'
import PublisherFilter from '../components/PublisherFilter'
import DownloadPathPicker from '../components/DownloadPathPicker'
import { CATEGORIES } from '../types'

export default function SearchPage(): React.JSX.Element {
  const {
    keyword,
    results,
    page,
    hasMore,
    loading,
    error,
    activeTeamId,
    activeTeamName,
    publisherSnapshot,
    setKeyword,
    setResults,
    setLoading,
    setError,
    setTeamFilter,
    clearTeamFilter,
    updatePublisherSnapshot
  } = useSearchStore()
  useDownloadStore()
  const { setPage } = useUIStore()
  const [inputValue, setInputValue] = useState(keyword)
  const [selectedCategory, setSelectedCategory] = useState(2)
  const [pickerState, setPickerState] = useState<{
    url: string; title: string; size: string; detailUrl: string; path: string
  } | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(
    async (kw: string, p: number, sid: number, teamId?: string, append = false) => {
      setLoading(true)
      setError(null)
      try {
        const res = await window.api.search(kw, p, sid, teamId)
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

  useEffect(() => {
    if (results.length === 0) {
      doSearch('', 1, selectedCategory)
    }
  }, [])

  function handleSearch(): void {
    const kw = inputValue.trim()
    setKeyword(kw)
    clearTeamFilter()
    doSearch(kw, 1, selectedCategory)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') handleSearch()
  }

  function handleLoadMore(): void {
    doSearch(keyword, page + 1, selectedCategory, activeTeamId ?? undefined, true)
  }

  function handleCategoryChange(id: number): void {
    setSelectedCategory(id)
    clearTeamFilter()
    doSearch(keyword, 1, id)
  }

  function handleTeamFilter(teamId: string, name: string): void {
    if (activeTeamId === teamId) {
      clearTeamFilter()
      doSearch(keyword, 1, selectedCategory)
    } else {
      setTeamFilter(teamId, name)
      doSearch(keyword, 1, selectedCategory, teamId)
    }
  }

  async function handleDownload(url: string, title: string, size: string, detailUrl: string): Promise<void> {
    const settings = await window.api.settingsGet()
    const effectivePath = settings.lastUsedDownloadPath || settings.downloadPath

    if (settings.suppressDownloadPickerUntil > Date.now()) {
      await window.api.downloadAdd(url, title, size, detailUrl, effectivePath)
      setPage('downloads')
      return
    }

    setPickerState({ url, title, size, detailUrl, path: effectivePath })
  }

  function handleScroll(): void {
    if (scrollRef.current) {
      setShowBackToTop(scrollRef.current.scrollTop > 300)
    }
  }

  function scrollToTop(): void {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePickerConfirm(path: string, suppress: boolean): Promise<void> {
    const settings = await window.api.settingsGet()
    await window.api.settingsSave({
      ...settings,
      lastUsedDownloadPath: path,
      suppressDownloadPickerUntil: suppress ? Date.now() + 7 * 24 * 60 * 60 * 1000 : 0
    })
    await window.api.downloadAdd(pickerState!.url, pickerState!.title, pickerState!.size, pickerState!.detailUrl, path)
    setPickerState(null)
    setPage('downloads')
  }

  return (
    <div className="flex flex-col h-full">
      {pickerState && (
        <DownloadPathPicker
          defaultPath={pickerState.path}
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerState(null)}
        />
      )}

      {/* 粘性顶栏 */}
      <header className="drag-region sticky top-0 z-20 flex items-center justify-between px-8 h-16 bg-[#fbf9f5]/90 backdrop-blur-md shrink-0">
        <h2 className="font-headline text-lg font-bold text-[#526446]">资源检索</h2>
        <div className="no-drag flex items-center gap-3">
          <div className="relative flex items-center bg-white border border-[#b2b2ad]/30 rounded-full px-4 py-2 focus-within:border-[#526446]/40 focus-within:shadow-[0_0_0_3px_rgba(82,100,70,0.08)] transition-all duration-200 w-64">
            <Search size={14} className="text-[#7a7b76] shrink-0 mr-2" />
            <input
              type="text"
              placeholder="搜寻番剧、漫画或音乐..."
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

      {/* 分类筛选 */}
      <div className="flex items-center gap-2 px-8 py-3 shrink-0 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer
              ${selectedCategory === cat.id
                ? 'bg-[#526446] text-white shadow-sm'
                : 'bg-[#f5f4ef] text-[#5e605b] hover:bg-[#e9e8e3] hover:text-[#31332f]'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 字幕组筛选 */}
      {publisherSnapshot.length > 0 && (
        <PublisherFilter
          activeTeamId={activeTeamId}
          activeTeamName={activeTeamName}
          onSelectTeam={handleTeamFilter}
        />
      )}

      {/* 结果列表 */}
      <div className="flex-1 min-h-0 relative">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-6 pt-2 pb-8">
        {error && (
          <div className="flex items-center gap-2 mx-2 mb-4 p-3 rounded-xl bg-[#a73b21]/8 border border-[#a73b21]/20 text-sm text-[#a73b21]">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && keyword && (
          <div className="flex flex-col items-center justify-center h-full text-[#b2b2ad] gap-3">
            <Search size={40} className="opacity-30" />
            <p className="text-sm">未找到相关资源</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {results.map((r) => (
            <ResourceCard key={r.id} resource={r} onDownload={handleDownload} />
          ))}
        </div>

        {activeTeamId && results.length === 0 && !loading && (
          <div className="flex items-center justify-center py-8 text-sm text-[#b2b2ad]">
            该字幕组暂无相关资源
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={handleLoadMore}
            className="flex items-center justify-center gap-2 w-full py-4 mt-2 text-sm text-[#7a7b76] hover:text-[#31332f] hover:bg-[#f5f4ef] rounded-xl transition-colors duration-150 cursor-pointer"
          >
            <ChevronDown size={15} />
            加载更多
          </button>
        )}

        {loading && results.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={18} className="text-[#526446] animate-spin" />
          </div>
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
      {results.length > 0 && (
        <div className="px-8 py-2 text-[10px] text-[#b2b2ad] font-medium shrink-0 flex items-center justify-between border-t border-[#efeee9]">
          <span>
            {keyword ? `"${keyword}" · ` : '最新動畫 · '}
            {results.length} 条结果
            {activeTeamName && ` · ${activeTeamName}`}
          </span>
        </div>
      )}
    </div>
  )
}
