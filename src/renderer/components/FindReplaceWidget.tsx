import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function FindReplaceWidget() {
  const setShowRegexPanel = useAppStore(s => s.setShowRegexPanel)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)

  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [useRegex, setUseRegex] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [matchInfo, setMatchInfo] = useState('')
  const [error, setError] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Load editing preset from store
  const editingRegexPreset = useAppStore(s => s.editingRegexPreset)
  useEffect(() => {
    if (editingRegexPreset) {
      setEditingId(editingRegexPreset.id)
      setFindText(editingRegexPreset.pattern)
      setReplaceText(editingRegexPreset.replacement)
      setPresetName(editingRegexPreset.name)
      useAppStore.getState().setEditingRegexPreset(null)
    }
  }, [editingRegexPreset])

  const search = useCallback(() => {
    if (!findText.trim()) { setMatchCount(0); setMatchInfo(''); setError(''); return }
    const { lines, editRange } = useAppStore.getState()
    try {
      const start = editRange ? editRange.start : 0
      const end = editRange ? editRange.end : lines.length - 1
      const content = lines.slice(start, end + 1).join('\n')
      const pattern = findText.replace(/\\n/g, '\n')
      const re = useRegex ? new RegExp(pattern, 'gms') : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = content.match(re)
      const count = matches ? matches.length : 0
      setMatchCount(count)
      setMatchInfo(count > 0 ? `${count} 个匹配` : '无匹配')
      setError('')
    } catch {
      setMatchCount(0); setMatchInfo(''); setError('正则语法错误')
    }
  }, [findText, useRegex])

  useEffect(() => { search() }, [search])

  const handleReplace = () => {
    if (!findText.trim() || matchCount === 0) return
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = useAppStore.getState()
    const start = editRange ? editRange.start : 0
    const end = editRange ? editRange.end : lines.length - 1

    pushUndo({ lines: [...lines], range: { start, end } })

    const content = lines.slice(start, end + 1).join('\n')
    const pattern = findText.replace(/\\n/g, '\n')
    const flags = useRegex ? 'gms' : 'g'
    const re = useRegex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
    const realReplace = replaceText.replace(/\\n/g, '\n')
    const newContent = content.replace(re, realReplace)

    if (newContent === content) return

    const newRangeLines = newContent.split('\n')
    const newLines = [...lines]
    newLines.splice(start, end - start + 1, ...newRangeLines)

    setLines(newLines)
    setEditedRange({ start, end: start + newRangeLines.length - 1 })
    setCursorLine(start)
    setEditRange(null)
    setTimeout(() => search(), 50)
  }

  // Add to rule list only (no status bar button)
  const handleAddToRuleList = () => {
    if (!findText.trim()) return
    const name = presetName.trim() || findText.slice(0, 4)
    const store = useAppStore.getState()

    if (editingId) {
      store.updateRegexPreset(editingId, { name, pattern: findText, replacement: replaceText })
    } else {
      store.addRegexPreset({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, pattern: findText, replacement: replaceText
      })
    }
    setPresetName(''); setShowNameInput(false); setEditingId(null)
  }

  // Add to rule list AND create status bar button
  const handleAddAsButton = () => {
    if (!findText.trim()) return
    if (!presetName.trim()) { setShowNameInput(true); return }
    const store = useAppStore.getState()
    const id = editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6))

    if (editingId) {
      store.updateRegexPreset(editingId, { name: presetName.trim(), pattern: findText, replacement: replaceText })
    } else {
      store.addRegexPreset({
        id, name: presetName.trim(), pattern: findText, replacement: replaceText
      })
    }

    // Also add to permanent store for persistence
    window.api.loadPermanent().then(data => {
      const exists = data.presets.some(p => p.id === id)
      if (!exists) {
        data.presets.push({ id, name: presetName.trim(), pattern: findText, replacement: replaceText })
      }
      window.api.savePermanent(data)
    })

    setPresetName(''); setShowNameInput(false); setEditingId(null)
  }

  return (
    <div className="fixed top-12 right-4 z-[9999] w-[420px]">
      <div className="bg-[#252526] border border-white/10 rounded-lg shadow-2xl text-white text-xs">
        {/* Find row */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <span className="text-white/40 text-[10px] w-10">查找</span>
          <input autoFocus value={findText}
            onChange={(e) => { setFindText(e.target.value); setError('') }}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.getElementById('replace-input')?.focus() }
              if (e.key === 'Escape') { e.preventDefault(); setShowRegexPanel(false) }
            }}
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
          <input id="replace-input" value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); setShowRegexPanel(false) }
              if (e.key === 'Enter') { e.preventDefault(); handleReplace() }
            }}
            className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="替换为（支持 \\n 换行）"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 p-2">
          <button onClick={handleReplace} disabled={matchCount === 0}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-40 disabled:cursor-not-allowed">
            替换
          </button>
          <div className="flex-1" />

          {showNameInput ? (
            <div className="flex items-center gap-1">
              <input value={presetName} onChange={(e) => setPresetName(e.target.value.slice(0, 4))} maxLength={4}
                className="w-16 px-1 py-0.5 bg-[#1e1e1e] border border-white/10 rounded text-[10px] focus:outline-none focus:border-blue-500"
                placeholder="名称" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddAsButton(); if (e.key === 'Escape') setShowNameInput(false) }} />
              <button onClick={handleAddToRuleList} className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-[10px]" title="仅添加到规则列表">列表</button>
              <button onClick={handleAddAsButton} className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 rounded text-[10px]" title="添加到规则列表+底栏按钮">按钮</button>
              <button onClick={() => { setShowNameInput(false); setEditingId(null) }} className="px-1.5 py-0.5 text-gray-400 hover:text-white">✗</button>
            </div>
          ) : (
            <>
              <button onClick={() => { if (findText.trim()) setShowNameInput(true) }}
                disabled={!findText.trim()}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-40 disabled:cursor-not-allowed">
                {editingId ? '更新' : '添加'}
              </button>
            </>
          )}

          <button onClick={() => setShowRegexPanel(false)} className="px-2 py-1 text-gray-400 hover:text-white">关闭</button>
        </div>

        {error && <div className="px-2 pb-1 text-red-400 text-[10px]">{error}</div>}
      </div>
    </div>
  )
}
