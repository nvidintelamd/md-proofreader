import React, { useState } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function RegexPanel() {
  const regexPresets = useAppStore(s => s.regexPresets)
  const setShowRegexPanel = useAppStore(s => s.setShowRegexPanel)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)
  const deleteRegexPreset = useAppStore(s => s.deleteRegexPreset)

  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [replacement, setReplacement] = useState('')
  const [error, setError] = useState('')

  const handleNameChange = (val: string) => {
    // Count Chinese characters (each counts as 1)
    if (val.length > 4) {
      setError('名称最多4个字符')
      return
    }
    setName(val)
    setError('')
  }

  const handleSave = () => {
    if (!name.trim()) { setError('请输入名称'); return }
    if (!pattern.trim()) { setError('请输入正则表达式'); return }

    // Validate regex
    try {
      new RegExp(pattern)
    } catch {
      setError('正则表达式语法错误')
      return
    }

    const preset: RegexPreset = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      pattern,
      replacement
    }
    addRegexPreset(preset)
    setName('')
    setPattern('')
    setReplacement('')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-[9999]" onMouseDown={(e) => e.preventDefault()}>
      {/* Backdrop — does NOT close the panel */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#252526] border border-white/10 rounded-lg shadow-2xl w-[500px] text-white text-xs">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">正则表达式管理</span>
            <button
              onClick={() => setShowRegexPanel(false)}
              className="text-white/40 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-white/50 mb-1">名称（最多4个字符）</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={4}
              className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-white/10 rounded text-xs focus:outline-none focus:border-blue-500"
              placeholder="如：去空格"
            />
          </div>

          {/* Pattern */}
          <div>
            <label className="block text-white/50 mb-1">正则表达式（JavaScript）</label>
            <input
              value={pattern}
              onChange={(e) => { setPattern(e.target.value); setError('') }}
              className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
              placeholder="如：^\s+|\s+$"
            />
          </div>

          {/* Replacement */}
          <div>
            <label className="block text-white/50 mb-1">替换为（支持 $1 $2）</label>
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
              placeholder="留空即删除匹配内容"
            />
          </div>

          {error && <div className="text-red-400 text-[11px]">{error}</div>}

          <button
            onClick={handleSave}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium"
          >
            保存
          </button>
        </div>

        {/* Saved presets list */}
        {regexPresets.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3 space-y-1.5 max-h-[200px] overflow-y-auto">
            <div className="text-white/40 text-[10px] mb-1">已保存的正则</div>
            {regexPresets.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#1e1e1e] rounded px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/30 ml-2 font-mono truncate">{p.pattern}</span>
                </div>
                <button
                  onClick={() => deleteRegexPreset(p.id)}
                  className="ml-2 text-red-400 hover:text-red-300 px-1"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
