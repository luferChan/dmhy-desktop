const path = require('path')
const fs = require('fs')
const { spawnSync, execSync } = require('child_process')

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return

  const appBundle = fs.readdirSync(context.appOutDir).find((f) => f.endsWith('.app'))
  if (!appBundle) return

  const appPath = path.join(context.appOutDir, appBundle)
  console.log(`[afterSign] Unifying ad-hoc signatures: ${appBundle}`)

  // macOS 26+ requires every binary loaded by a process to share the same Team ID.
  // electron-builder falls back to ad-hoc signing (Team ID = "") for the outer app
  // shell, but codesign --deep does NOT descend into versioned framework directories
  // (e.g. Electron Framework.framework/Versions/A/), so the inner Electron Framework
  // binary retains Electron's official Team ID, causing a Team ID mismatch crash.
  //
  // Fix: after electron-builder's own signing pass, enumerate every regular file in
  // the bundle (deepest paths first so inner binaries are signed before outer
  // bundles), attempt ad-hoc signing on each, then re-sign the bundle root.

  const files = execSync(`find "${appPath}" -type f`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((f) => f.length > 0)
    // Sort deepest paths first — sign innermost binaries before their enclosing bundles
    .sort((a, b) => b.split('/').length - a.split('/').length)

  for (const file of files) {
    // codesign fails silently on non-Mach-O files; suppress noise, don't abort
    spawnSync('codesign', ['--force', '--sign', '-', '--timestamp=none', file], {
      stdio: 'pipe'
    })
  }

  // Re-sign the bundle root last so its CodeDirectory covers the now-updated contents
  execSync(`codesign --force --sign - --timestamp=none "${appPath}"`, { stdio: 'inherit' })
  console.log('[afterSign] Done')
}
