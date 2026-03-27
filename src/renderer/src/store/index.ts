import { create } from 'zustand'
import type { Resource, DownloadTask, AppSettings } from '../types'

interface SearchState {
  keyword: string
  results: Resource[]
  page: number
  hasMore: boolean
  loading: boolean
  error: string | null
  activeTeamId: string | null
  activeTeamName: string | null
  favoritePublishers: string[]
  setKeyword: (k: string) => void
  setResults: (r: Resource[], page: number, hasMore: boolean, append: boolean) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setTeamFilter: (teamId: string, name: string) => void
  clearTeamFilter: () => void
  setFavoritePublishers: (list: string[]) => void
  toggleFavoritePublisher: (p: string) => void
}

interface DownloadState {
  tasks: Map<string, DownloadTask>
  addTask: (task: DownloadTask) => void
  updateTask: (task: DownloadTask) => void
  updateProgress: (data: Partial<DownloadTask> & { id: string }) => void
  removeTask: (id: string) => void
  setTasks: (tasks: DownloadTask[]) => void
}

interface SettingsState {
  settings: AppSettings | null
  setSettings: (s: AppSettings) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  keyword: '',
  results: [],
  page: 1,
  hasMore: false,
  loading: false,
  error: null,
  activeTeamId: null,
  activeTeamName: null,
  favoritePublishers: [],

  setKeyword: (keyword) => set({ keyword }),
  setResults: (resources, page, hasMore, append) =>
    set((s) => ({
      results: append ? [...s.results, ...resources] : resources,
      page,
      hasMore
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setTeamFilter: (teamId, name) => set({ activeTeamId: teamId, activeTeamName: name }),
  clearTeamFilter: () => set({ activeTeamId: null, activeTeamName: null }),
  setFavoritePublishers: (list) => set({ favoritePublishers: list }),
  toggleFavoritePublisher: (p) =>
    set((s) => {
      const list = s.favoritePublishers.includes(p)
        ? s.favoritePublishers.filter((x) => x !== p)
        : [...s.favoritePublishers, p]
      return { favoritePublishers: list }
    })
}))

export const useDownloadStore = create<DownloadState>((set) => ({
  tasks: new Map(),

  addTask: (task) =>
    set((s) => {
      const next = new Map(s.tasks)
      next.set(task.id, task)
      return { tasks: next }
    }),
  updateTask: (task) =>
    set((s) => {
      const next = new Map(s.tasks)
      next.set(task.id, task)
      return { tasks: next }
    }),
  updateProgress: (data) =>
    set((s) => {
      const existing = s.tasks.get(data.id)
      if (!existing) return s
      const next = new Map(s.tasks)
      next.set(data.id, { ...existing, ...data })
      return { tasks: next }
    }),
  removeTask: (id) =>
    set((s) => {
      const next = new Map(s.tasks)
      next.delete(id)
      return { tasks: next }
    }),
  setTasks: (tasks) =>
    set({ tasks: new Map(tasks.map((t) => [t.id, t])) })
}))

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings })
}))

export type AppPage = 'search' | 'downloads' | 'settings'

interface UIState {
  currentPage: AppPage
  setPage: (page: AppPage) => void
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'search',
  setPage: (currentPage) => set({ currentPage })
}))
