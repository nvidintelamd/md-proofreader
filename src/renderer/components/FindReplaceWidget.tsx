import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function FindReplaceWidget() {
  const setShowRegexPanel = useAppStore(s => s.setShowRegexPanel)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)
  const updateRegexPreset = useAppStore(s => s.updateRegexPreset)

  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [useRegex, setUseRegex] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [matchInfo, setMatchInfo] = useState('')
  const [error, setError] = useState('')
  const [showPresetName, setShowPresetName] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)

  // Load editing preset from store
  const editingRegexPreset = useAppStore(s => s.editingRegexPreset)
  useEffect(() => {
    if (editingRegexPreset) {
      setEditingId(editingRegexPreset.id)
      setFindText(editingRegexPreset.pattern)
      setReplaceText(editingRegexPreset.replacement)
      setPresetName(editingRegexPreset.name)
      setShowPresets(false)
      // Clear the preset from store after loading
      useAppStore.getState().setEditingRegexPreset(null)
    }
  }, [editingRegexPreset])

  // Live search — multi-line: join all lines, search full content
  const search = useCallback(() => {
    if (!findText.trim()) { setMatchCount(0); setMatchInfo(''); setError(''); return }
    const { lines, editRange } = useAppStore.getState()
    try {
      const start = editRange ? editRange.start : 0
      const end = editRange ? editRange.end : lines.length - 1
      const content = lines.slice(start, end + 1).join('\n')
      // Convert literal \n to real newlines in find pattern
      const pattern = findText.replace(/\\n/g, '\n')
      const re = useRegex ? new RegExp(pattern, 'gms') : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = content.match(re)
      const count = matches ? matches.length : 0
      setMatchCount(count)
      setMatchInfo(count > 0 ? `${count} 个匹配` : '无匹配')
      setError('')
    } catch {
      setMatchCount(0)
      setMatchInfo('')
      setError('正则语法错误')
    }
  }, [findText, useRegex])

  useEffect(() => { search() }, [search])

  // Replace — multi-line: join lines, replace on full content, split back
  const handleReplace = (replaceAll: boolean) => {
    if (!findText.trim() || matchCount === 0) return

    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = useAppStore.getState()
    const start = editRange ? editRange.start : 0
    const end = editRange ? editRange.end : lines.length - 1

    pushUndo({ lines: [...lines], range: { start, end } })

    const content = lines.slice(start, end + 1).join('\n')
    const flags = useRegex ? 'gms' : 'g'
    const pattern = findText.replace(/\\n/g, '\n')
    const re = useRegex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
    const realReplace = replaceText.replace(/\\n/g, '\n')

    let newContent: string
    if (replaceAll) {
      newContent = content.replace(re, realReplace)
    } else {
      newContent = content.replace(re, realReplace)
    }

    if (newContent === content) return

    // Split back to lines and update store
    const newRangeLines = newContent.split('\n')
    const newLines = [...lines]
    newLines.splice(start, end - start + 1, ...newRangeLines)

    setLines(newLines)
    setEditedRange({ start, end: start + newRangeLines.length - 1 })
    setCursorLine(start)
    setEditRange(null)

    setTimeout(() => search(), 50)
  }

  const handleSavePreset = () => {
    if (!findText.trim()) return
    if (!presetName.trim()) { setShowPresetName(true); return }

    if (editingId) {
      updateRegexPreset(editingId, { name: presetName.trim(), pattern: findText, replacement: replaceText })
    } else {
      addRegexPreset({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: presetName.trim(),
        pattern: findText,
        replacement: replaceText
      })
    }
    setPresetName('')
    setShowPresetName(false)
    setEditingId(null)
  }

  const handleDeletePreset = (id: string) => {
    useAppStore.getState().deleteRegexPreset(id)
  }

  const handleLoadPreset = (p: RegexPreset) => {
    setEditingId(p.id)
    setFindText(p.pattern)
    setReplaceText(p.replacement)
    setPresetName(p.name)
    setShowPresets(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't capture events from input fields (name input, find input, replace input)
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'Escape') setShowRegexPanel(false)
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplace(false) }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleReplace(true) }
  }

  const regexPresets = useAppStore(s => s.regexPresets)

  return (
    <div className="fixed top-12 right-4 z-[9999] w-[440px]" onKeyDown={handleKeyDown}>
      <div className="bg-[#252526] border border-white/10 rounded-lg shadow-2xl text-white text-xs">
        {/* Find row */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <span className="text-white/40 text-[10px] w-10">查找</span>
          <input autoFocus value={findText}
            onChange={(e) => { setFindText(e.target.value); setError('') }}
            className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="查找内容（支持多行正则）"
          />
          <button onClick={() => setUseRegex(!useRegex)}
            className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${useRegex ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'}`}
            title="正则表达式"
          >.*</button>
          <span className="text-[10px] text-white/40 w-16 text-right">{matchInfo}</span>
        </div>

        {/* Replace row */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <span className="text-white/40 text-[10px] w-10">替换</span>
          <input value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="替换为（支持 \\n 换行）"
          />
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <button onClick={() => handleReplace(false)} disabled={matchCount === 0}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-40 disabled:cursor-not-allowed">替换</button>
          <button onClick={() => handleReplace(true)} disabled={matchCount === 0}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-40 disabled:cursor-not-allowed">全部替换</button>
          <div className="flex-1" />

          {/* Save/update preset */}
          {showPresetName ? (
            <div className="flex items-center gap-1">
              <input value={presetName} onChange={(e) => setPresetName(e.target.value.slice(0, 4))} maxLength={4}
                className="w-16 px-1 py-0.5 bg-[#1e1e1e] border border-white/10 rounded text-[10px] focus:outline-none focus:border-blue-500"
                placeholder="名称" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset() }} />
              <button onClick={handleSavePreset} className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 rounded text-[10px]">✓</button>
              <button onClick={() => { setShowPresetName(false); setEditingId(null) }} className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-[10px]">✗</button>
            </div>
          ) : (
            <button onClick={() => { if (findText.trim()) setShowPresetName(true) }}
              disabled={!findText.trim()}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded disabled:opacity-40 disabled:cursor-not-allowed text-[10px]">
              {editingId ? '更新按钮' : '添加为按钮'}
            </button>
          )}

          {/* Preset list toggle */}
          {regexPresets.length > 0 && (
            <button onClick={() => setShowPresets(!showPresets)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[10px]">管理</button>
          )}

          {/* Permanentize button - only when editing a preset */}
          {editingId && findText.trim() && (
            <button onClick={() => {
              const permPresets = useAppStore.getState().regexPresets
              const preset = permPresets.find(p => p.id === editingId)
              if (!preset) return
              // Add to permanent store
              window.api.loadPermanent().then(data => {
                const newPreset = { id: preset.id, name: preset.name, pattern: preset.pattern, replacement: preset.replacement }
                const exists = data.presets.some(p => p.id === preset.id)
                if (!exists) data.presets.push(newPreset)
                window.api.savePermanent(data)
              })
              useAppStore.getState().setShowPermManager(true)
            }}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 rounded text-[10px]">永久化</button>
          )}
          <button onClick={() => setShowRegexPanel(false)} className="px-2 py-1 text-gray-400 hover:text-white text-[10px]">关闭</button>
        </div>

        {error && <div className="px-2 pb-1 text-red-400 text-[10px]">{error}</div>}

        {/* Preset management list */}
        {showPresets && regexPresets.length > 0 && (
          <div className="px-2 py-2 space-y-1 max-h-[160px] overflow-y-auto border-t border-white/10">
            {regexPresets.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#1e1e1e] rounded px-2 py-1.5">
                <button onClick={() => handleLoadPreset(p)} className="flex-1 min-w-0 text-left hover:text-blue-400">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/30 ml-2 font-mono text-[10px] truncate">{p.pattern}</span>
                </button>
                <button onClick={() => handleDeletePreset(p.id)} className="ml-2 text-red-400 hover:text-red-300 px-1 text-[10px]">删除</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
