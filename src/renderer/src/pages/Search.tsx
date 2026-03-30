import React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { Search, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
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
    setKeyword,
    setResults,
    setLoading,
    setError,
    setTeamFilter,
    clearTeamFilter
  } = useSearchStore()
  useDownloadStore()
  const { setPage } = useUIStore()
  const [inputValue, setInputValue] = useState(keyword)
  const [selectedCategory, setSelectedCategory] = useState(2)
  const [pickerState, setPickerState] = useState<{
    url: string; title: string; size: string; detailUrl: string; path: string
  } | null>(null)

  const doSearch = useCallback(
    async (kw: string, p: number, sid: number, teamId?: string, append = false) => {
      setLoading(true)
      setError(null)
      try {
        const res = await window.api.search(kw, p, sid, teamId)
        setResults(res.resources, res.page, res.hasMore, append)
      } catch (e: unknown) {
        setError((e as Error).message || '搜索失败，请重试')
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, setResults]
  )

  // Load latest on first open
  useEffect(() => {
    if (results.length === 0) {
      doSearch('', 1, selectedCategory)
    }
  }, [])

  function handleSearch(): void {
    const kw = inputValue.trim()
    if (!kw) return
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
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a4a] bg-[#16162a] shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[#0F0F23] border border-[#2a2a4a] rounded-xl px-3 py-2 focus-within:border-[#7C3AED] transition-colors duration-150">
          <Search size={16} className="text-[#94A3B8] shrink-0" />
          <input
            type="text"
            placeholder="输入番剧名称搜索..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-[#E2E8F0] placeholder-[#475569] outline-none"
          />
          {loading && <Loader2 size={14} className="text-[#7C3AED] animate-spin shrink-0" />}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !inputValue.trim()}
          className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#8B5CF6] transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          搜索
        </button>
      </div>

      {/* Category filter */}
      <div className="drag-region flex items-center gap-1.5 px-4 py-2 border-b border-[#2a2a4a] shrink-0 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`no-drag px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer border
              ${
                selectedCategory === cat.id
                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                  : 'bg-transparent border-[#2a2a4a] text-[#94A3B8] hover:border-[#7C3AED88] hover:text-[#E2E8F0]'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Publisher filter */}
      {results.length > 0 && (
        <PublisherFilter
          resources={results}
          activeTeamId={activeTeamId}
          activeTeamName={activeTeamName}
          onSelectTeam={handleTeamFilter}
        />
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="flex items-center gap-2 mx-4 my-3 p-3 rounded-xl bg-[#F43F5E11] border border-[#F43F5E33] text-sm text-[#F43F5E]">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && keyword && (
          <div className="flex flex-col items-center justify-center h-full text-[#475569] gap-2">
            <Search size={40} className="opacity-30" />
            <p className="text-sm">未找到相关资源</p>
          </div>
        )}

        {results.map((r) => (
          <ResourceCard key={r.id} resource={r} onDownload={handleDownload} />
        ))}

        {activeTeamId && results.length === 0 && !loading && (
          <div className="flex items-center justify-center py-8 text-sm text-[#475569]">
            该字幕组暂无相关资源
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={handleLoadMore}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#16162a] transition-colors duration-150 cursor-pointer"
          >
            <ChevronDown size={16} />
            加载更多
          </button>
        )}

        {loading && results.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="text-[#7C3AED] animate-spin" />
          </div>
        )}
      </div>

      {/* Results count */}
      {results.length > 0 && (
        <div className="px-4 py-2 border-t border-[#2a2a4a] bg-[#16162a] text-xs text-[#475569] shrink-0">
          {keyword ? `"${keyword}" ` : '最新動畫 '}
          共 {results.length} 条
          {activeTeamName && ` · ${activeTeamName}`}
        </div>
      )}
    </div>
  )
}
