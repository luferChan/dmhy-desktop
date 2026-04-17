import React from 'react'
import { useEffect, useState } from 'react'
import { Settings, FolderOpen, Save, Check, Download, Globe, Leaf } from 'lucide-react'
import { useSettingsStore } from '../store'
import type { AppSettings } from '../types'

export default function SettingsPage(): React.JSX.Element {
  const { settings, setSettings } = useSettingsStore()
  const [form, setForm] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  async function handleSelectFolder(): Promise<void> {
    const path = await window.api.selectFolder()
    if (path && form) setForm({ ...form, downloadPath: path })
  }

  async function handleSave(): Promise<void> {
    if (!form) return
    const toSave =
      settings && form.downloadPath !== settings.downloadPath
        ? { ...form, suppressDownloadPickerUntil: 0 }
        : form
    await window.api.settingsSave(toSave)
    setSettings(toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center h-full text-[#b2b2ad] text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 粘性顶栏 */}
      <header className="drag-region sticky top-0 z-20 flex items-center justify-between px-8 h-16 bg-[#fbf9f5]/90 backdrop-blur-md shrink-0">
        <h2 className="font-headline text-lg font-bold text-[#526446]">设置</h2>
        <Settings size={18} className="text-[#b2b2ad]" />
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-16">
        {/* 页面标题 */}
        <div className="relative mb-8 pt-2">
          <span className="absolute -top-2 -left-4 opacity-10 pointer-events-none select-none">
            <Leaf size={48} className="text-[#5b6242]" />
          </span>
          <p className="text-[#5e605b] text-sm">在这里调整您的动漫花园体验。</p>
        </div>

        {/* Bento 网格 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* 下载设置 */}
          <section className="bg-[#f5f4ef] rounded-xl p-6 flex flex-col gap-5 hover:bg-[#efeee9] transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#526446]/10 flex items-center justify-center">
                <Download size={16} className="text-[#526446]" />
              </div>
              <h3 className="font-headline text-base font-semibold text-[#31332f]">下载设置</h3>
            </div>

            <div className="space-y-5">
              {/* 下载目录 */}
              <div>
                <label className="text-[10px] font-bold text-[#7a7b76] uppercase tracking-wider block mb-2">
                  默认保存路径
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border-none rounded-lg px-3 py-2 text-sm text-[#31332f] truncate">
                    {form.downloadPath}
                  </div>
                  <button
                    onClick={handleSelectFolder}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#526446] text-white text-xs font-semibold hover:bg-[#47583b] transition-colors duration-150 cursor-pointer shrink-0"
                  >
                    <FolderOpen size={12} />
                    更改
                  </button>
                </div>
              </div>

              {/* 最大并行下载数 */}
              <div>
                <label className="text-[10px] font-bold text-[#7a7b76] uppercase tracking-wider block mb-2">
                  最大并行下载数
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, maxConcurrentDownloads: n })}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer border
                        ${form.maxConcurrentDownloads === n
                          ? 'bg-[#526446] border-[#526446] text-white shadow-sm'
                          : 'bg-white border-transparent text-[#5e605b] hover:border-[#526446]/30 hover:text-[#31332f]'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* 做种开关 */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <div>
                  <p className="text-sm font-medium text-[#31332f]">完成后继续做种</p>
                  <p className="text-[11px] text-[#7a7b76] mt-0.5">关闭后节省带宽</p>
                </div>
                <button
                  onClick={() => setForm({ ...form, seedAfterDownload: !form.seedAfterDownload })}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer shrink-0
                    ${form.seedAfterDownload ? 'bg-[#526446]' : 'bg-[#d4e9c3]'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
                      ${form.seedAfterDownload ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* 网络设置 */}
          <section className="bg-[#f5f4ef] rounded-xl p-6 flex flex-col gap-5 hover:bg-[#efeee9] transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5b6242]/10 flex items-center justify-center">
                <Globe size={16} className="text-[#5b6242]" />
              </div>
              <h3 className="font-headline text-base font-semibold text-[#31332f]">网络设置</h3>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#7a7b76] uppercase tracking-wider block mb-2">
                代理地址
              </label>
              <input
                type="text"
                placeholder="如 http://127.0.0.1:7890"
                value={form.proxyUrl}
                onChange={(e) => setForm({ ...form, proxyUrl: e.target.value })}
                className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm text-[#31332f] placeholder-[#b2b2ad] outline-none focus:ring-2 focus:ring-[#526446]/20 transition-all duration-150"
              />
              <p className="text-[11px] text-[#7a7b76] mt-2">可选，用于访问动漫花园资源站。</p>
            </div>

            <div className="p-3 bg-[#f6fed3]/60 rounded-xl flex items-start gap-2 mt-auto">
              <Leaf size={14} className="text-[#5b6242] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#5b6242] leading-relaxed">
                如遇到资源库加载缓慢，请尝试配置代理或切换至更稳定的网络环境。
              </p>
            </div>
          </section>
        </div>

        {/* 保存按钮 */}
        <div className="mb-8">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#526446] text-white text-sm font-semibold hover:bg-[#47583b] transition-colors duration-200 cursor-pointer shadow-sm"
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        {/* 分割线 */}
        <div className="border-t border-[#e9e8e3] mb-8" />

        {/* 关于 */}
        <section className="bg-white rounded-2xl p-8 shadow-[0_4px_40px_-8px_rgba(49,51,47,0.06)] border border-[#b2b2ad]/10 flex gap-8 items-center">
          <div className="relative shrink-0 group">
            <div className="absolute -inset-3 bg-[#d4e9c3] rounded-full opacity-30 blur-xl group-hover:opacity-50 transition-opacity" />
            <div className="relative w-20 h-20 rounded-2xl bg-[#d4e9c3] flex items-center justify-center shadow-sm">
              <Leaf size={32} className="text-[#526446]" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-end gap-3">
              <h3 className="font-headline text-2xl font-black text-[#526446]">动漫花园</h3>
              <span className="text-sm text-[#7a7b76] pb-1">v1.0.4</span>
            </div>
            <p className="text-[#5e605b] text-sm leading-relaxed">
              面向动漫爱好者的现代化种子下载客户端，让每一份番剧资源触手可得。
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Electron', 'React', 'TypeScript', 'aria2'].map((t) => (
                <span key={t} className="px-3 py-1 bg-[#f5f4ef] text-[10px] font-bold text-[#7a7b76] rounded-full uppercase tracking-wide">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[#b2b2ad] pt-1">© 2026 lufer.chen</p>
          </div>
        </section>
      </div>
    </div>
  )
}
