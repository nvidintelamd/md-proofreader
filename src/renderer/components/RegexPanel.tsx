import React, { useState, useEffect } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function RegexPanel() {
  const regexPresets = useAppStore(s => s.regexPresets)
  const setShowRegexPanel = useAppStore(s => s.setShowRegexPanel)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)
  const deleteRegexPreset = useAppStore(s => s.deleteRegexPreset)
  const updateRegexPreset = useAppStore(s => s.updateRegexPreset)
  const lines = useAppStore(s => s.lines)
  const editRange = useAppStore(s => s.editRange)

  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [replacement, setReplacement] = useState('')
  const [error, setError] = useState('')
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Listen for edit events from StatusBar right-click
  useEffect(() => {
    const handler = (e: Event) => {
      const preset = (e as CustomEvent).detail as RegexPreset
      if (preset) handleEdit(preset)
    }
    window.addEventListener('regex-edit', handler)
    return () => window.removeEventListener('regex-edit', handler)
  }, [])

  // Live match preview
  useEffect(() => {
    if (!pattern.trim()) { setMatchCount(null); return }
    try {
      const re = new RegExp(pattern, 'g')
      const start = editRange ? editRange.start : 0
      const end = editRange ? editRange.end : lines.length - 1
      let count = 0
      for (let i = start; i <= end; i++) {
        if (re.test(lines[i])) count++
      }
      setMatchCount(count)
      setError('')
    } catch {
      setMatchCount(null)
      setError('正则语法错误')
    }
  }, [pattern, lines, editRange])

  const handleNameChange = (val: string) => {
    if (val.length > 4) return
    setName(val)
  }

  const handleSave = () => {
    if (!name.trim()) { setError('请输入名称'); return }
    if (!pattern.trim()) { setError('请输入正则表达式'); return }
    try { new RegExp(pattern) } catch { setError('正则语法错误'); return }

    if (editingId) {
      updateRegexPreset(editingId, { name: name.trim(), pattern, replacement })
    } else {
      addRegexPreset({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name.trim(),
        pattern,
        replacement
      })
    }
    setName(''); setPattern(''); setReplacement(''); setError(''); setMatchCount(null); setEditingId(null)
  }

  const handleEdit = (p: RegexPreset) => {
    setEditingId(p.id)
    setName(p.name)
    setPattern(p.pattern)
    setReplacement(p.replacement)
    setError('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setName(''); setPattern(''); setReplacement(''); setError(''); setMatchCount(null)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-[#252526] border border-white/10 rounded-lg shadow-2xl w-[520px] max-h-[80vh] flex flex-col text-white text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm">{editingId ? '编辑正则' : '正则表达式管理'}</span>
          <button onClick={() => setShowRegexPanel(false)} className="text-white/40 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-white/50 mb-1">名称（最多4个字符）</label>
            <input value={name} onChange={(e) => handleNameChange(e.target.value)} maxLength={4}
              className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-white/10 rounded focus:outline-none focus:border-blue-500" placeholder="如：去空格" />
          </div>
          <div>
            <label className="block text-white/50 mb-1">正则表达式（JavaScript）</label>
            <input value={pattern} onChange={(e) => { setPattern(e.target.value); setError('') }}
              className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-white/10 rounded font-mono focus:outline-none focus:border-blue-500" placeholder="如：^\s+|\s+$" />
          </div>
          <div>
            <label className="block text-white/50 mb-1">替换为（支持 $1 $2，\n换行）</label>
            <input value={replacement} onChange={(e) => setReplacement(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-white/10 rounded font-mono focus:outline-none focus:border-blue-500" placeholder="留空即删除" />
          </div>

          {/* Match preview */}
          {matchCount !== null && !error && (
            <div className={`text-[11px] px-2 py-1 rounded ${matchCount > 0 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
              {matchCount > 0 ? `匹配到 ${matchCount} 行` : '无匹配结果'}
            </div>
          )}
          {error && <div className="text-red-400 text-[11px] px-2 py-1 bg-red-900/20 rounded">{error}</div>}

          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium">
              {editingId ? '更新' : '保存'}
            </button>
            {editingId && (
              <button onClick={handleCancelEdit}
                className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 rounded">取消</button>
            )}
          </div>
        </div>

        {/* Saved presets */}
        {regexPresets.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3 space-y-1.5 max-h-[200px] overflow-y-auto">
            <div className="text-white/40 text-[10px] mb-1">已保存的正则</div>
            {regexPresets.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#1e1e1e] rounded px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/30 ml-2 font-mono truncate">{p.pattern}</span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => handleEdit(p)} className="text-blue-400 hover:text-blue-300 px-1">编辑</button>
                  <button onClick={() => deleteRegexPreset(p.id)} className="text-red-400 hover:text-red-300 px-1">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
