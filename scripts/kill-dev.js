#!/usr/bin/env node
// Kill any process occupying the Vite dev port (5173) before starting a new dev session.
// This prevents "port already in use" errors and stale Electron windows.

const { execSync, spawnSync } = require('child_process')

const VITE_PORT = 5173

function getPidsOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = spawnSync(
        'powershell',
        ['-Command', `(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess`],
        { encoding: 'utf-8' }
      )
      return (result.stdout || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => n > 0)
    } else {
      const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf-8' })
      return (result.stdout || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => n > 0)
    }
  } catch {
    return []
  }
}

const pids = getPidsOnPort(VITE_PORT)
if (pids.length === 0) {
  process.exit(0)
}

console.log(`[kill-dev] port ${VITE_PORT} occupied by pid(s): ${pids.join(', ')} — killing...`)
for (const pid of pids) {
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // already gone
  }
}

// Give the OS a moment to release the port
const deadline = Date.now() + 2000
while (Date.now() < deadline) {
  const remaining = getPidsOnPort(VITE_PORT)
  if (remaining.length === 0) break
  // busy-wait in small increments (sync script, short duration)
  execSync('node -e "setTimeout(()=>{},100)"')
}

console.log(`[kill-dev] port ${VITE_PORT} is now free`)
