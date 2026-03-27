import { EventEmitter } from 'events'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { spawn, ChildProcess } from 'child_process'
import crypto from 'crypto'
import { loadCache, cacheUpsert, cacheUpdateGid, cacheDelete, flushCacheNow } from './task-cache'

function parseBytes(sizeStr: string): number {
  const m = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i)
  if (!m) return 0
  const val = parseFloat(m[1])
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024
  }
  return Math.round(val * (units[m[2].toLowerCase()] || 0))
}

export interface DownloadTask {
  id: string
  magnetUrl: string
  name: string
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  downloaded: number
  total: number
  status: 'downloading' | 'paused' | 'completed' | 'error' | 'waiting' | 'seeding'
  error?: string
  savePath: string
  files: Array<{ name: string; length: number; progress: number }>
  eta: number
  addedAt: number
}

const RPC_PORT = 16800

function getAria2BinaryPath(): string {
  if (!app.isPackaged) {
    return 'aria2c'
  }
  if (process.platform === 'win32') {
    return path.join(process.resourcesPath, 'aria2c.exe')
  }
  const bundled = path.join(process.resourcesPath, 'aria2c')
  if (fs.existsSync(bundled)) {
    return bundled
  }
  return 'aria2c'
}

class Downloader extends EventEmitter {
  private aria2Process: ChildProcess | null = null
  private tasks = new Map<string, DownloadTask>()
  private taskIdToGid = new Map<string, string>()
  private gidToTaskId = new Map<string, string>()
  private downloadPath: string
  private proxyUrl = ''
  private seedAfterDownload = false
  private secret: string
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private sessionFile: string

  constructor() {
    super()
    this.downloadPath = app.getPath('downloads')
    this.secret = crypto.randomBytes(16).toString('hex')
    this.sessionFile = path.join(app.getPath('userData'), 'aria2.session')
  }

  private log(msg: string): void {
    console.log(msg)
    this.emit('log', msg)
  }

  private buildArgs(): string[] {
    const args = [
      '--enable-rpc',
      `--rpc-listen-port=${RPC_PORT}`,
      `--rpc-secret=${this.secret}`,
      '--rpc-listen-all=false',
      '--continue=true',
      '--auto-file-renaming=false',
      `--save-session=${this.sessionFile}`,
      '--save-session-interval=30',
      '--max-concurrent-downloads=5',
      '--bt-enable-lpd=true',
      '--enable-dht=true',
      '--enable-dht6=false',
      '--bt-tracker-connect-timeout=10',
      '--bt-tracker-timeout=15',
      '--follow-torrent=true'
    ]
    if (!this.seedAfterDownload) {
      args.push('--seed-time=0')
    }
    if (this.proxyUrl) {
      args.push(`--all-proxy=${this.proxyUrl}`)
    }
    if (fs.existsSync(this.sessionFile)) {
      args.push(`--input-file=${this.sessionFile}`)
    }
    return args
  }

  private rpc(method: string, params: unknown[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 'dmhy',
        method,
        params: [`token:${this.secret}`, ...params]
      })
      const req = http.request(
        {
          host: '127.0.0.1',
          port: RPC_PORT,
          path: '/jsonrpc',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              if (json.error) reject(new Error(json.error.message))
              else resolve(json.result)
            } catch (e) {
              reject(e)
            }
          })
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }

  private async waitForRpc(): Promise<void> {
    for (let i = 0; i < 30; i++) {
      try {
        await this.rpc('aria2.getVersion')
        return
      } catch {
        await new Promise((r) => setTimeout(r, 300))
      }
    }
    throw new Error('aria2 RPC did not respond after 9s')
  }

  private async restoreSession(): Promise<void> {
    try {
      const [active, waiting] = (await Promise.all([
        this.rpc('aria2.tellActive'),
        this.rpc('aria2.tellWaiting', [0, 100])
      ])) as [any[], any[]]
      const all = [...(active || []), ...(waiting || [])]
      for (const item of all) {
        const gid: string = item.gid
        if (!this.gidToTaskId.has(gid)) {
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
          const magnetUri: string =
            item.bittorrent ? (item.infoHash ? `magnet:?xt=urn:btih:${item.infoHash}` : '') : ''
          const task: DownloadTask = {
            id,
            magnetUrl: magnetUri,
            name: item.bittorrent?.info?.name || '正在解析...',
            progress: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            downloaded: parseInt(item.completedLength || '0', 10),
            total: parseInt(item.totalLength || '0', 10),
            status: 'waiting',
            savePath: item.dir || this.downloadPath,
            files: [],
            eta: 0,
            addedAt: Date.now()
          }
          this.tasks.set(id, task)
          this.taskIdToGid.set(id, gid)
          this.gidToTaskId.set(gid, id)
          this.emit('task-added', { ...task })
        }
      }
    } catch (e) {
      this.log(`[aria2] restore session failed: ${(e as Error).message}`)
    }
  }

  async start(): Promise<void> {
    // Pre-populate task state from cache so UI shows tasks immediately
    const cached = loadCache()
    for (const [taskId, entry] of Object.entries(cached)) {
      this.tasks.set(taskId, { ...entry.task })
      this.taskIdToGid.set(taskId, entry.gid)
      this.gidToTaskId.set(entry.gid, taskId)
      this.emit('task-added', { ...entry.task })
    }

    await this.launchAria2()
  }

  private spawnProcess(): void {
    const bin = getAria2BinaryPath()
    const args = this.buildArgs()
    this.log(`[aria2] starting: ${bin}`)

    // Strip system proxy env vars — we control proxy via --all-proxy
    const env = { ...process.env }
    for (const k of ['all_proxy', 'ALL_PROXY', 'http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY']) {
      delete env[k]
    }

    this.aria2Process = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env
    })

    this.aria2Process.stdout?.on('data', (d: Buffer) => {
      const line = d.toString().trim()
      if (line) this.log(`[aria2] ${line}`)
    })
    this.aria2Process.stderr?.on('data', (d: Buffer) => {
      const line = d.toString().trim()
      if (line) this.log(`[aria2] ${line}`)
    })
    this.aria2Process.on('error', (e) => {
      this.log(`[aria2] process error: ${e.message}`)
    })
    this.aria2Process.on('exit', (code) => {
      this.log(`[aria2] exited with code ${code}`)
      this.aria2Process = null
    })
  }

  private async launchAria2(isRetry = false): Promise<void> {
    this.spawnProcess()

    // Race: RPC responds (normal) vs process exits immediately (port conflict)
    try {
      await new Promise<void>((resolve, reject) => {
        this.aria2Process!.once('exit', () => reject(new Error('early-exit')))
        this.waitForRpc().then(resolve, reject)
      })
    } catch (e) {
      if ((e as Error).message === 'early-exit' && !isRetry) {
        this.log(`[aria2] port ${RPC_PORT} occupied, clearing orphan process...`)
        await this.killOrphanOnPort()
        await new Promise((r) => setTimeout(r, 300))
        return this.launchAria2(true)
      }
      throw e
    }

    await this.restoreSession()
    this.log('[aria2] ready')
    this.startPolling()
  }

  private killOrphanOnPort(): Promise<void> {
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32'
      const cmd = isWin ? 'powershell' : 'lsof'
      const args = isWin
        ? [
            '-Command',
            `(Get-NetTCPConnection -LocalPort ${RPC_PORT} -ErrorAction SilentlyContinue).OwningProcess`
          ]
        : ['-ti', `tcp:${RPC_PORT}`]

      const ps = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] })
      let out = ''
      ps.stdout?.on('data', (d: Buffer) => (out += d.toString()))
      ps.on('close', () => {
        const pids = out
          .trim()
          .split(/\s+/)
          .filter(Boolean)
        for (const pid of pids) {
          const n = parseInt(pid, 10)
          if (n && n !== process.pid) {
            try {
              process.kill(n, 'SIGKILL')
              this.log(`[aria2] killed orphan pid=${n} on port ${RPC_PORT}`)
            } catch {}
          }
        }
        resolve()
      })
      ps.on('error', () => resolve())
    })
  }

  private startPolling(): void {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => this.poll(), 1000)
  }

  private async poll(): Promise<void> {
    if (!this.aria2Process) return
    try {
      const [active, waiting, stopped] = (await Promise.all([
        this.rpc('aria2.tellActive'),
        this.rpc('aria2.tellWaiting', [0, 100]),
        this.rpc('aria2.tellStopped', [0, 100])
      ])) as [any[], any[], any[]]
      const all = [...(active || []), ...(waiting || []), ...(stopped || [])]

      // First pass: register followedBy GIDs (magnet → metadata → real torrent)
      for (const item of all) {
        if (item.followedBy && Array.isArray(item.followedBy)) {
          const taskId = this.gidToTaskId.get(item.gid)
          if (taskId) {
            for (const followGid of item.followedBy as string[]) {
              if (!this.gidToTaskId.has(followGid)) {
                this.gidToTaskId.set(followGid, taskId)
                this.taskIdToGid.set(taskId, followGid)
                cacheUpdateGid(taskId, followGid)
                this.log(`[aria2] follow gid=${followGid} → task=${taskId}`)
              }
            }
          }
        }
      }

      // Second pass: update task state
      for (const item of all) {
        this.updateFromAria2(item)
      }
    } catch {
      // RPC may fail briefly during shutdown
    }
  }

  private updateFromAria2(item: any): void {
    const gid: string = item.gid
    const taskId = this.gidToTaskId.get(gid)
    if (!taskId) return

    const task = this.tasks.get(taskId)
    if (!task) return

    // If this GID was superseded by a followedBy GID, skip progress updates
    if (this.taskIdToGid.get(taskId) !== gid) return

    // Skip HTTP pre-torrent phase: aria2 downloads the .torrent file itself (no bittorrent field).
    // Prevents a brief 100% flash before the real torrent GID takes over via followedBy.
    if (!item.bittorrent) return

    const totalLength = parseInt(item.totalLength || '0', 10)
    const completedLength = parseInt(item.completedLength || '0', 10)
    const dlSpeed = parseInt(item.downloadSpeed || '0', 10)
    const ulSpeed = parseInt(item.uploadSpeed || '0', 10)

    if (item.bittorrent?.info?.name) {
      task.name = item.bittorrent.info.name
    } else if (item.files?.[0]?.path && task.name === '正在解析...') {
      const resolved = path.basename(item.files[0].path)
      if (!resolved.includes('[MEMORY]') && !resolved.includes('[METADATA]')) {
        task.name = resolved
      }
    }

    if (totalLength > task.total) task.total = totalLength
    task.downloaded = completedLength
    task.downloadSpeed = dlSpeed
    task.uploadSpeed = ulSpeed
    task.eta = dlSpeed > 0 ? Math.round((totalLength - completedLength) / dlSpeed) : 0
    task.progress = totalLength > 0 ? Math.round((completedLength / totalLength) * 100) : 0

    if (item.files) {
      task.files = item.files.map((f: any) => {
        const fTotal = parseInt(f.length || '0', 10)
        const fDone = parseInt(f.completedLength || '0', 10)
        return {
          name: path.basename(f.path || ''),
          length: fTotal,
          progress: fTotal > 0 ? Math.round((fDone / fTotal) * 100) : 0
        }
      })
    }

    const prevStatus = task.status
    switch (item.status) {
      case 'active':
        if (totalLength > 0 && completedLength >= totalLength) {
          task.status = 'seeding'
        } else {
          task.status = 'downloading'
        }
        break
      case 'waiting':
        task.status = 'waiting'
        break
      case 'paused':
        task.status = 'paused'
        break
      case 'error':
        task.status = 'error'
        task.error = item.errorMessage || 'Unknown error'
        break
      case 'complete':
        // If this task spawned a follow-up (metadata → real torrent), don't complete yet
        if (item.followedBy && (item.followedBy as string[]).length > 0) break
        task.status = 'completed'
        task.progress = 100
        task.downloadSpeed = 0
        break
    }

    cacheUpsert(taskId, gid, task)

    if (task.status === 'completed' && prevStatus !== 'completed') {
      this.emit('task-completed', { ...task })
    } else if (task.status === 'error' && prevStatus !== 'error') {
      this.emit('task-error', { id: taskId, error: task.error })
    } else if (task.status !== prevStatus) {
      this.emit('task-updated', { ...task })
    } else if (task.status === 'downloading') {
      this.emit('task-progress', { ...task })
    }
  }

  setProxyUrl(url: string): void {
    this.proxyUrl = url
    if (this.aria2Process) {
      this.rpc('aria2.changeGlobalOption', [{ 'all-proxy': url }]).catch((e) => {
        this.log(`[aria2] changeGlobalOption proxy failed: ${(e as Error).message}`)
      })
    }
  }

  setDownloadPath(p: string): void {
    this.downloadPath = p
    if (this.aria2Process) {
      this.rpc('aria2.changeGlobalOption', [{ dir: p }]).catch((e) => {
        this.log(`[aria2] changeGlobalOption dir failed: ${(e as Error).message}`)
      })
    }
  }

  setSeedAfterDownload(val: boolean): void {
    this.seedAfterDownload = val
    if (!this.aria2Process) return
    if (!val) {
      // Disable seeding globally
      this.rpc('aria2.changeGlobalOption', [{ 'seed-time': '0' }]).catch(() => {})
      // Stop any tasks that are currently seeding
      for (const [taskId, task] of this.tasks) {
        if (task.status === 'seeding') {
          const gid = this.taskIdToGid.get(taskId)
          if (gid) {
            this.rpc('aria2.changeOption', [gid, { 'seed-time': '0' }]).catch(() => {})
          }
        }
      }
    } else {
      // Re-enable seeding: restore default seed-ratio behaviour
      this.rpc('aria2.changeGlobalOption', [{ 'seed-ratio': '1.0' }]).catch(() => {})
    }
  }

  getDownloadPath(): string {
    return this.downloadPath
  }

  getTasks(): DownloadTask[] {
    return Array.from(this.tasks.values())
  }

  getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id)
  }

  async add(
    magnetUrl: string,
    savePath?: string,
    prefillName?: string,
    prefillSize?: string
  ): Promise<string> {
    const resolvedPath = savePath || this.downloadPath
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)

    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true })
    }

    const task: DownloadTask = {
      id,
      magnetUrl,
      name: prefillName || '正在解析...',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: 0,
      total: prefillSize ? parseBytes(prefillSize) : 0,
      status: 'waiting',
      savePath: resolvedPath,
      files: [],
      eta: 0,
      addedAt: Date.now()
    }
    this.tasks.set(id, task)
    this.emit('task-added', { ...task })

    try {
      const gid = (await this.rpc('aria2.addUri', [[magnetUrl], { dir: resolvedPath }])) as string
      this.taskIdToGid.set(id, gid)
      this.gidToTaskId.set(gid, id)
      cacheUpsert(id, gid, task)
      this.log(`[aria2] added gid=${gid} id=${id}`)
    } catch (e) {
      task.status = 'error'
      task.error = `Failed to add download: ${(e as Error).message}`
      this.emit('task-error', { id, error: task.error })
    }

    return id
  }

  updateTaskName(id: string, name: string): void {
    const task = this.tasks.get(id)
    if (!task) return
    task.name = name
    const gid = this.taskIdToGid.get(id) || ''
    cacheUpsert(id, gid, task)
    this.emit('task-updated', { ...task })
  }

  pause(id: string): void {
    const task = this.tasks.get(id)
    const gid = this.taskIdToGid.get(id)
    if (!gid || !task) return
    // Optimistic update: reflect paused state immediately before aria2 confirms
    task.status = 'paused'
    cacheUpsert(id, gid, task)
    this.emit('task-updated', { ...task })
    // forcePause skips graceful wait, takes effect immediately
    this.rpc('aria2.forcePause', [gid]).catch((e) => {
      this.log(`[aria2] pause failed: ${(e as Error).message}`)
    })
  }

  resume(id: string): void {
    const task = this.tasks.get(id)
    const gid = this.taskIdToGid.get(id)
    if (!gid || !task) return
    // Optimistic update
    task.status = 'waiting'
    cacheUpsert(id, gid, task)
    this.emit('task-updated', { ...task })
    this.rpc('aria2.unpause', [gid]).catch((e) => {
      this.log(`[aria2] unpause failed: ${(e as Error).message}`)
    })
  }

  remove(id: string, deleteFiles = false): void {
    const gid = this.taskIdToGid.get(id)
    const task = this.tasks.get(id)

    if (gid) {
      this.rpc('aria2.forceRemove', [gid])
        .catch(() => {})
        .finally(() => {
          this.rpc('aria2.removeDownloadResult', [gid]).catch(() => {})
        })
      this.gidToTaskId.delete(gid)
      this.taskIdToGid.delete(id)
    }

    if (deleteFiles && task) {
      const torrentDir = path.join(task.savePath, task.name)
      try {
        if (fs.existsSync(torrentDir) && fs.statSync(torrentDir).isDirectory()) {
          fs.rmSync(torrentDir, { recursive: true, force: true })
          const aria2Ctrl = torrentDir + '.aria2'
          if (fs.existsSync(aria2Ctrl)) fs.unlinkSync(aria2Ctrl)
        } else {
          for (const f of task.files) {
            const fp = path.join(task.savePath, f.name)
            if (fs.existsSync(fp)) fs.unlinkSync(fp)
            const aria2Ctrl = fp + '.aria2'
            if (fs.existsSync(aria2Ctrl)) fs.unlinkSync(aria2Ctrl)
          }
        }
      } catch (e) {
        console.error('[Downloader] failed to delete files:', e)
      }
    }

    this.tasks.delete(id)
    cacheDelete(id)
    this.emit('task-removed', { id })
  }

  async destroy(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    flushCacheNow()
    const proc = this.aria2Process
    if (!proc) return
    try {
      await this.rpc('aria2.shutdown')
    } catch {
      // ignore
    }
    await new Promise<void>((resolve) => {
      let resolved = false
      const done = (): void => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      }
      // Graceful exit: aria2.shutdown should trigger process exit
      proc.once('exit', () => {
        clearTimeout(hardTimer)
        done()
      })
      // Hard deadline: force-kill after 2s, then give 500ms for the kill to register
      const hardTimer = setTimeout(() => {
        try {
          proc.kill()
        } catch {}
        setTimeout(done, 500)
      }, 2000)
    })
  }
}

export const downloader = new Downloader()
