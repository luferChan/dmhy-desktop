# 动漫花园 Desktop

动漫花园 [dmhy.org](https://dmhy.org) 的桌面客户端，支持搜索、一键下载种子资源，内置 aria2 下载引擎，全平台可用。

---

## 功能特性

- **搜索** — 按关键词搜索动漫资源，支持分类筛选（动漫、日剧、RAW 等）和发布组过滤
- **一键下载** — 优先使用 .torrent 文件下载（速度快），自动回落 Magnet 链接
- **下载管理** — 实时进度、速度、ETA 显示，支持暂停 / 恢复 / 删除（含删除本地文件）
- **做种控制** — 可选完成后继续做种或立即停止
- **代理支持** — 全局 HTTP 代理，同时覆盖网页抓取和 BitTorrent 流量
- **会话恢复** — 退出后重启自动恢复未完成的下载任务
- **跨平台** — Windows、macOS、Linux

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Electron 39 |
| 前端 | React 19 · TypeScript · Tailwind CSS v4 |
| 状态管理 | Zustand |
| 下载引擎 | aria2（JSON-RPC，内置二进制） |
| 网页抓取 | axios · cheerio |
| 数据持久化 | electron-store · 自定义任务缓存 |

---

## 下载安装

前往 [Releases](../../releases) 页面下载对应平台的安装包：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `dmhy-desktop-*-setup.exe` | NSIS 安装程序（推荐） |
| Windows | `dmhy-desktop-*-portable.exe` | 免安装便携版 |
| macOS (Intel) | `dmhy-desktop-*-x64.dmg` | x64 |
| macOS (Apple Silicon) | `dmhy-desktop-*-arm64.dmg` | arm64 |

> **macOS 首次打开提示「无法验证开发者」**：前往「系统设置 → 隐私与安全性」，点击「仍要打开」。

---

## 开发环境

### 前置要求

- Node.js 18+
- npm
- macOS/Linux 需本地安装 `aria2c`（开发模式下从 PATH 查找）

```bash
# macOS
brew install aria2

# Ubuntu/Debian
sudo apt install aria2
```

### 启动开发服务器

```bash
npm install
npm run dev
```

### 可用脚本

```bash
npm run dev          # 启动开发模式（热更新）
npm run build:mac    # 构建 macOS DMG
npm run build:win    # 构建 Windows 安装包（NSIS + 便携版）
npm run build:linux  # 构建 Linux AppImage
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint 代码检查
npm run format       # Prettier 格式化
```

---

## 项目结构

```
src/
├── main/                 # Electron 主进程
│   ├── index.ts          # 应用入口，窗口创建，生命周期管理
│   ├── downloader.ts     # aria2 封装，下载任务管理
│   ├── ipc-handlers.ts   # IPC 通信桥接
│   ├── scraper.ts        # dmhy.org 网页抓取
│   ├── store.ts          # 设置持久化（electron-store）
│   └── task-cache.ts     # 下载任务缓存（任务/GID 映射）
├── preload/              # 渲染进程桥接层
│   ├── index.ts          # contextBridge 暴露 API
│   └── index.d.ts        # 全局类型声明
└── renderer/src/         # React 前端
    ├── App.tsx           # 根组件，侧边栏导航，窗口控件
    ├── pages/            # 搜索页、下载页、设置页
    ├── components/       # ResourceCard、DownloadItem、PublisherFilter
    ├── store/            # Zustand 状态管理
    ├── types/            # 共享类型定义
    └── assets/           # 全局样式
```

---

## aria2 二进制文件

生产包内置了预编译的 aria2 可执行文件：

| 平台 | 路径 | 来源 |
|------|------|------|
| Windows | `resources/aria2c.exe` | aria2 官方 Release v1.37.0 |
| macOS | `resources/aria2c` | 由构建机器的 Homebrew 复制 |

macOS 构建前需确认 `resources/aria2c` 已就位，可使用以下脚本从 Homebrew 复制：

```bash
bash scripts/setup-aria2-mac.sh
```

---

## 用户数据

应用数据存储在系统用户目录（`app.getPath('userData')`），不包含任何账户或认证信息：

| 文件 | 内容 |
|------|------|
| `settings.json` | 下载目录、并发数、代理地址、做种开关 |
| `tasks.json` | 下载任务缓存（重启恢复用） |
| `aria2.session` | aria2 会话文件（断点续传用） |

---

## License

MIT © 2026 lufer.chen
