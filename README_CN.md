# 动漫花园 Desktop

<p align="center">
  <img alt="version" src="https://img.shields.io/github/v/release/luferChan/dmhy-desktop?style=flat-square&label=版本">
  <img alt="platform" src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS-blue?style=flat-square">
  <img alt="electron" src="https://img.shields.io/badge/Electron-39.8.8-47848F?style=flat-square&logo=electron">
  <img alt="license" src="https://img.shields.io/badge/许可证-MIT-green?style=flat-square">
</p>

动漫花园 [dmhy.org](https://dmhy.org) 的桌面客户端，支持搜索、一键下载种子资源，内置 aria2 下载引擎，界面清爽美观。

> English documentation: [README.md](./README.md)

---

## 截图预览

![搜索页](docs/screenshots/search.png)
![下载页](docs/screenshots/download.png)
![设置页](docs/screenshots/setting.png)

---

## 功能特性

### 核心功能

- **搜索** — 按关键词搜索动漫资源，支持分类筛选（动漫、日剧、RAW 等）和发布组过滤
- **一键下载** — 优先使用 `.torrent` 文件下载（速度快），自动回落 Magnet 链接
- **下载管理** — 实时进度、速度、ETA 显示，支持暂停 / 恢复 / 删除（含删除本地文件）
- **做种控制** — 可选完成后继续做种或立即停止，节省带宽
- **代理支持** — 全局 HTTP 代理，同时覆盖网页抓取和 BitTorrent 流量
- **会话恢复** — 退出后重启自动恢复未完成的下载任务
- **跨平台** — Windows 和 macOS

### 近期版本新增

- **v1.0.4** — 修复 macOS 26 (Tahoe) 兼容性：Electron 升级至 39.8.8，对所有 bundle 二进制统一 ad-hoc 重签名；修复下载页列标题对齐；窗口拖拽区域扩展至内容区顶栏；移除冗余下载百分比显示
- **v1.0.3** — 支持空关键词搜索；滚动超过 300px 后显示回到顶部按钮；简化发布组过滤交互；更宽的滚动条
- **v1.0.2** — 界面全面重设计：「植物工坊」设计系统（鼠尾草绿 + 暖纸白），双列卡片布局，带文字标签的新侧边栏，Bento 网格设置页
- **v1.0.1** — 下载目录选择弹窗（含 7 天免打扰），下载时长统计，开发服务器端口冲突检测

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

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Electron 39.8.8 |
| 前端 | React 19.2.1 · TypeScript 5.9.3 · Tailwind CSS v4.2.2 |
| 状态管理 | Zustand 5 |
| 下载引擎 | aria2 v1.37.0（JSON-RPC，内置二进制） |
| 网页抓取 | axios · cheerio |
| 数据持久化 | electron-store · 自定义任务缓存 |

---

## 开发环境

### 前置要求

- Node.js 18+
- npm
- macOS 需本地安装 `aria2c`（开发模式下从 PATH 查找）

```bash
# macOS
brew install aria2
```

### 启动开发服务器

```bash
npm install
npm run dev
```

### 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动开发模式（热更新） |
| `npm run build:mac` | 构建 macOS DMG（Intel + Apple Silicon） |
| `npm run build:win` | 构建 Windows 安装包（NSIS + 便携版） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run format` | Prettier 格式化 |

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

## 更新日志

| 版本 | 主要更新 |
|------|----------|
| **v1.0.4** | macOS 26 兼容性修复 · 下载列表列对齐修复 · 窗口拖拽区域扩展 · UI 细节优化 |
| **v1.0.3** | 空关键词搜索 · 回到顶部按钮 · 简化发布组筛选 · 更宽滚动条 |
| **v1.0.2** | 「植物工坊」UI 全面重设计 · 双列卡片 · Bento 设置页 · 新侧边栏 |
| **v1.0.1** | 下载目录选择弹窗 · 时长统计 · 端口冲突检测 |
| **v1.0.0** | 首次发布 — 搜索、下载、做种控制、代理支持、会话恢复 |

完整 Release 说明请见 [Releases](../../releases) 页面。

---

## License

MIT © 2026 lufer.chen
