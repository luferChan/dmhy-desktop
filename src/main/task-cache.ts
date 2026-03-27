import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { DownloadTask } from './downloader'

export interface CachedEntry {
  gid: string
  task: DownloadTask
}

type CacheStore = Record<string, CachedEntry>

let memStore: CacheStore | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getCachePath(): string {
  return path.join(app.getPath('userData'), 'tasks.json')
}

export function loadCache(): CacheStore {
  try {
    const raw = fs.readFileSync(getCachePath(), 'utf-8')
    const parsed = JSON.parse(raw) as CacheStore
    memStore = parsed
    return parsed
  } catch {
    memStore = {}
    return {}
  }
}

function getStore(): CacheStore {
  if (!memStore) return loadCache()
  return memStore
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    const p = getCachePath()
    try {
      fs.writeFileSync(p, JSON.stringify(getStore()), 'utf-8')
    } catch (e) {
      console.error('[task-cache] flush failed:', e)
    }
  }, 300)
}

export function flushCacheNow(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  try {
    fs.writeFileSync(getCachePath(), JSON.stringify(getStore()), 'utf-8')
  } catch (e) {
    console.error('[task-cache] flush failed:', e)
  }
}

export function cacheUpsert(taskId: string, gid: string, task: DownloadTask): void {
  getStore()[taskId] = { gid, task: { ...task } }
  scheduleFlush()
}

export function cacheUpdateGid(taskId: string, newGid: string): void {
  const store = getStore()
  if (store[taskId]) {
    store[taskId].gid = newGid
    scheduleFlush()
  }
}

export function cacheDelete(taskId: string): void {
  delete getStore()[taskId]
  scheduleFlush()
}
