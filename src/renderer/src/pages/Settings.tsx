import React from 'react'
import { useEffect, useState } from 'react'
import { Settings, FolderOpen, Save, Check, Antenna } from 'lucide-react'
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
      <div className="flex items-center justify-center h-full text-[#475569] text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶栏 */}
      <div className="drag-region flex items-center gap-2 px-4 py-3 border-b border-[#2a2a4a] bg-[#16162a] shrink-0">
        <Settings size={18} className="text-[#A78BFA]" />
        <h1 className="text-sm font-semibold text-[#E2E8F0]">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* 下载设置 */}
        <section>
          <h2 className="text-xs font-semibold text-[#94A3B8] mb-3">
            下载设置
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#E2E8F0] mb-1.5">默认下载目录</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#16162a] border border-[#2a2a4a] rounded-xl px-3 py-2">
                  <span className="text-sm text-[#94A3B8] truncate flex-1">{form.downloadPath}</span>
                </div>
                <button
                  onClick={handleSelectFolder}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2a2a4a] text-sm text-[#94A3B8] hover:bg-[#1e1e38] hover:text-[#E2E8F0] transition-all duration-150 cursor-pointer shrink-0"
                >
                  <FolderOpen size={14} />
                  选择
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#E2E8F0] mb-1.5">最大同时下载数</label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setForm({ ...form, maxConcurrentDownloads: n })}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border
                      ${
                        form.maxConcurrentDownloads === n
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                          : 'bg-transparent border-[#2a2a4a] text-[#94A3B8] hover:border-[#7C3AED88] hover:text-[#E2E8F0]'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#E2E8F0]">完成后继续做种</p>
                <p className="text-xs text-[#475569] mt-0.5">关闭后节省带宽</p>
              </div>
              <button
                onClick={() => setForm({ ...form, seedAfterDownload: !form.seedAfterDownload })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer
                  ${form.seedAfterDownload ? 'bg-[#7C3AED]' : 'bg-[#2a2a4a]'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                    ${form.seedAfterDownload ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 网络设置 */}
        <section>
          <h2 className="text-xs font-semibold text-[#94A3B8] mb-3">
            网络设置
          </h2>
          <div>
            <label className="block text-sm text-[#E2E8F0] mb-1.5">
              代理地址
              <span className="ml-2 text-xs text-[#475569]">（可选，用于访问动漫花园）</span>
            </label>
            <input
              type="text"
              placeholder="例如：http://127.0.0.1:7890"
              value={form.proxyUrl}
              onChange={(e) => setForm({ ...form, proxyUrl: e.target.value })}
              className="w-full bg-[#16162a] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-[#E2E8F0] placeholder-[#475569] outline-none focus:border-[#7C3AED] transition-colors duration-150"
            />
          </div>
        </section>

        {/* 保存按钮 */}
        <div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#8B5CF6] transition-colors duration-150 cursor-pointer"
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        {/* 分割线 */}
        <div className="border-t border-[#2a2a4a]" />

        {/* 关于 */}
        <section className="pb-4">
          <h2 className="text-xs font-semibold text-[#94A3B8] mb-3">
            关于
          </h2>
          <div className="bg-[#16162a] border border-[#2a2a4a] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#F43F5E] shrink-0">
                <Antenna size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E2E8F0]">动漫花园</p>
                <p className="text-xs text-[#475569]">v1.0.1</p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-[#475569]">
              <p>开发者 &nbsp;lufer.chen</p>
              <p>下载引擎 &nbsp;aria2</p>
              <p>运行时 &nbsp;Electron · React · TypeScript</p>
              <p className="pt-1.5 border-t border-[#2a2a4a]">© 2026 lufer.chen &nbsp;版权所有</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
