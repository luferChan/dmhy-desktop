# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`dmhy-desktop` — Electron + React + TypeScript desktop client for dmhy.org. Searches anime torrents via web scraping, downloads via a bundled aria2 binary over JSON-RPC. UI copy is Simplified Chinese; code/comments are English.

## Common commands

Run from the `dmhy-desktop/` directory:

| Task | Command |
|------|---------|
| Dev (hot reload, auto-kills stale Vite on port 5173) | `npm run dev` |
| Type check (runs both node + web projects) | `npm run typecheck` |
| Lint (cached) | `npm run lint` |
| Format | `npm run format` |
| Production build (typecheck → electron-vite build) | `npm run build` |
| macOS build (x64 + arm64 DMGs, requires `resources/aria2c`) | `npm run build:mac` |
| Windows build (NSIS + portable) | `npm run build:win` |
| Stage bundled macOS aria2 binary before first mac build | `bash scripts/setup-aria2-mac.sh` |

Dev prerequisite: `aria2c` on PATH (packaged builds ship their own binary from `resources/`).

## Architecture

Three-layer Electron split under `src/`:

- **`src/main/`** — Node/Electron main process. Owns the aria2 lifecycle, scraping, settings, and IPC. All privileged work lives here.
- **`src/preload/`** — Thin `contextBridge` layer exposing an `api` object on `window.api` (and `window.electron` via `@electron-toolkit/preload`). Schema is mirrored in `src/preload/index.d.ts`; keep both in sync when adding IPC methods.
- **`src/renderer/src/`** — React 19 + Tailwind v4 + Zustand UI. Alias `@renderer → src/renderer/src` (see `electron.vite.config.ts`). Pages live in `pages/`, shared UI in `components/`, global state in `store/index.ts` (four Zustand stores: search, download, settings, UI).

### Download pipeline (the non-obvious part)

1. `main/index.ts` starts `downloader` (singleton `EventEmitter` in `main/downloader.ts`) after creating the window so UI shows immediately.
2. `downloader.ts` spawns `aria2c` as a child process with a randomly generated RPC secret on port **16800**. If the port is occupied (orphan from a prior crash), it uses `lsof`/`Get-NetTCPConnection` to kill the offender and retries once.
3. Tasks have two identities: a **task id** (app-generated, stable across sessions) and a **GID** (aria2's handle, changes when a magnet resolves into a torrent metadata download). `taskIdToGid` / `gidToTaskId` maps bridge them; `cacheUpdateGid` in `main/task-cache.ts` persists the mapping.
4. `task-cache.ts` writes `tasks.json` with a 300 ms debounced flush. On startup, cached tasks are re-emitted to the UI before aria2 is even ready (so the download list isn't empty during launch), then `restoreSession()` reconciles against aria2's live state.
5. `main/ipc-handlers.ts` forwards all `downloader` events (`task-added`, `task-progress`, etc.) to the renderer on `download:<event>` channels. The `main:log` channel buffers messages until `did-finish-load` to avoid dropping startup logs.
6. Adding a download: renderer calls `downloadAdd(url, title, size, detailUrl?)`. For single-file torrents, the main process asynchronously fetches the file list from the detail page (`getResourceFiles`) to rename the task from the noisy search title to the actual filename — this runs in the background and does not block task creation.

### Scraping (`main/scraper.ts`)

- Targets `https://dmhy.org/topics/list/...` with `cheerio`. Selector is `table.tablesorter tbody tr`; column positions are load-bearing — update them together if dmhy.org changes layout.
- A single module-scoped `lastRequestTime` enforces a 1 s throttle between all outbound scraper requests.
- Proxy is applied uniformly: `setScraperProxy(url)` updates the scraper, `downloader.setProxyUrl(url)` passes `--all-proxy` to aria2. `settings-save` in `ipc-handlers.ts` fans a single settings change out to both.

### Settings persistence

`main/store.ts` writes plain JSON to `app.getPath('userData')/settings.json` (not `electron-store`, despite the dep being listed — it's unused). Defaults merge with loaded values so new fields are backfilled automatically.

### Window chrome

Windows uses a custom titlebar (`isWin` branch in `App.tsx`) with `drag-region` / `no-drag` CSS classes; macOS uses `hiddenInset` with repositioned traffic lights. The renderer checks `window.api.platform` (exposed from preload) to switch behavior.

## macOS packaging quirk (important)

`scripts/afterSign.js` walks every file in the `.app` bundle deepest-first and re-signs it ad-hoc (`codesign --sign -`), then re-signs the bundle root. This exists because macOS 26 (Tahoe) requires all binaries loaded by a process to share the same Team ID, but `codesign --deep` does not descend into versioned framework directories (e.g. `Electron Framework.framework/Versions/A/`), leaving the inner Electron binary with Electron's Team ID while the outer shell gets ad-hoc. Don't replace this with `--deep` — it won't fix the framework-internal signatures. If you touch mac signing, test a fresh DMG launch on macOS 26+.

Windows has no equivalent signing step; `afterPack.js` exists but is near-empty.

## TypeScript projects

Two `tsconfig` projects feed into `npm run typecheck`:
- `tsconfig.node.json` — main + preload (Node env)
- `tsconfig.web.json` — renderer (DOM/React)

`npm run build` runs typecheck first; a type error fails the build before `electron-vite build` runs.

## Git commit style

Commit messages should not include `Co-Authored-By: Claude` footers.
