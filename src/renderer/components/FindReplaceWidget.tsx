import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

export function FindReplaceWidget() {
  const setShowRegexPanel = useAppStore(s => s.setShowRegexPanel)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)
  const pushUndo = useAppStore(s => s.pushUndo)
  const setLines = useAppStore(s => s.setLines)
  const setEditedRange = useAppStore(s => s.setEditedRange)
  const setCursorLine = useAppStore(s => s.setCursorLine)
  const setEditRange = useAppStore(s => s.setEditRange)

  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [useRegex, setUseRegex] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [matchInfo, setMatchInfo] = useState('')
  const [error, setError] = useState('')
  const [showPresetName, setShowPresetName] = useState(false)
  const [presetName, setPresetName] = useState('')

  // Live search as user types
  const search = useCallback(() => {
    if (!findText.trim()) { setMatchCount(0); setMatchInfo(''); setError(''); return }
    try {
      const re = useRegex ? new RegExp(findText, 'g') : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      // Always read from store to avoid stale closure
      const { lines: currentLines, editRange: currentRange } = useAppStore.getState()
      const rangeStart = currentRange ? currentRange.start : 0
      const rangeEnd = currentRange ? currentRange.end : currentLines.length - 1
      let count = 0
      for (let i = rangeStart; i <= rangeEnd; i++) {
        re.lastIndex = 0
        if (re.test(currentLines[i])) count++
      }
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

  const handleReplace = (replaceAll: boolean) => {
    if (!findText.trim() || matchCount === 0) return

    let re: RegExp
    try {
      re = useRegex ? new RegExp(findText, 'g') : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    } catch { return }

    // Read from store to avoid stale closure
    const { lines: currentLines, editRange: currentRange } = useAppStore.getState()
    const start = currentRange ? currentRange.start : 0
    let end = currentRange ? currentRange.end : currentLines.length - 1

    pushUndo({ lines: [...currentLines], range: { start, end } })

    const newLines = [...currentLines]
    const realReplace = replaceText.replace(/\\n/g, '\n')
    let firstChanged = -1
    let lastChanged = -1

    for (let i = start; i <= end; i++) {
      const original = newLines[i]
      const result = newLines[i].replace(new RegExp(re.source, 'g'), realReplace)
      if (result !== original) {
        if (firstChanged === -1) firstChanged = i
        if (result.includes('\n')) {
          const splitLines = result.split('\n')
          newLines.splice(i, 1, ...splitLines)
          end += splitLines.length - 1
          lastChanged = i + splitLines.length - 1
        } else {
          newLines[i] = result
          lastChanged = i
        }
        if (!replaceAll) break
      }
    }

    setLines(newLines)
    if (firstChanged !== -1) {
      setEditedRange({ start: firstChanged, end: lastChanged })
      setCursorLine(firstChanged)
    }
    setEditRange(null)
    search()
  }

  const handleAddAsButton = () => {
    if (!findText.trim()) return
    if (!presetName.trim()) { setShowPresetName(true); return }

    addRegexPreset({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: presetName.trim(),
      pattern: findText,
      replacement: replaceText
    })
    setPresetName('')
    setShowPresetName(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowRegexPanel(false)
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleReplace(false)
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleReplace(true)
    }
  }

  return (
    <div className="fixed top-12 right-4 z-[9999] w-[420px]" onKeyDown={handleKeyDown}>
      <div className="bg-[#252526] border border-white/10 rounded-lg shadow-2xl text-white text-xs">
        {/* Find row */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <span className="text-white/40 text-[10px] w-10">查找</span>
          <input
            autoFocus
            value={findText}
            onChange={(e) => { setFindText(e.target.value); setError('') }}
            className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="查找内容"
          />
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${useRegex ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'}`}
            title="正则表达式"
          >.*</button>
          <span className="text-[10px] text-white/40 w-16 text-right">{matchInfo}</span>
        </div>

        {/* Replace row */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <span className="text-white/40 text-[10px] w-10">替换</span>
          <input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="替换为（支持 \\n 换行）"
          />
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-1 p-2">
          <button onClick={() => handleReplace(false)} disabled={matchCount === 0}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-40 disabled:cursor-not-allowed">
            替换
          </button>
          <button onClick={() => handleReplace(true)} disabled={matchCount === 0}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-40 disabled:cursor-not-allowed">
            全部替换
          </button>

          <div className="flex-1" />

          {showPresetName ? (
            <div className="flex items-center gap-1">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value.slice(0, 4))}
                maxLength={4}
                className="w-16 px-1 py-0.5 bg-[#1e1e1e] border border-white/10 rounded text-[10px] focus:outline-none focus:border-blue-500"
                placeholder="名称"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddAsButton() }}
              />
              <button onClick={handleAddAsButton} className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 rounded text-[10px]">✓</button>
              <button onClick={() => setShowPresetName(false)} className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-[10px]">✗</button>
            </div>
          ) : (
            <button onClick={() => { if (findText.trim()) setShowPresetName(true) }}
              disabled={!findText.trim()}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded disabled:opacity-40 disabled:cursor-not-allowed text-[10px]">
              添加为按钮
            </button>
          )}

          <button onClick={() => setShowRegexPanel(false)}
            className="px-2 py-1 text-gray-400 hover:text-white text-[10px]">关闭</button>
        </div>

        {error && <div className="px-2 pb-2 text-red-400 text-[10px]">{error}</div>}
      </div>
    </div>
  )
}
