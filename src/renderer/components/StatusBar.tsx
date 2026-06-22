import React from 'react'
import { useAppStore } from '../store/appStore'
import { useRegex } from '../hooks/useRegex'
import { convertHtmlTablesToMd } from '../lib/tableConvert'

export function StatusBar() {
  const files = useAppStore(s => s.files)
  const currentFileIndex = useAppStore(s => s.currentFileIndex)
  const cursorLine = useAppStore(s => s.cursorLine)
  const lines = useAppStore(s => s.lines)
  const mode = useAppStore(s => s.mode)
  const editRange = useAppStore(s => s.editRange)
  const regexPresets = useAppStore(s => s.regexPresets)
  const setShowRegexPanel = useAppStore(s => s.setShowRegexPanel)

  const { applyRegex } = useRegex()

  const currentFile = files[currentFileIndex]
  const progress = files.length > 0
    ? `${files.filter(f => f.done).length}/${files.length}`
    : '0/0'

  const modeText = { normal: '普通', edit_select: '选择', edit_modal: '编辑' }[mode]
  const modeColor = {
    normal: 'bg-gray-700 text-gray-300',
    edit_select: 'bg-yellow-800 text-yellow-200',
    edit_modal: 'bg-blue-800 text-blue-200'
  }[mode]

  const handleCopySelection = () => {
    const { lines, editRange } = useAppStore.getState()
    const start = editRange ? editRange.start : 0
    const end = editRange ? editRange.end : lines.length - 1
    navigator.clipboard.writeText(lines.slice(start, end + 1).join('\n'))
  }

  const handleTableConvert = () => {
    const { lines, editRange, pushUndo, setLines, setEditedRange, setCursorLine, setEditRange } = useAppStore.getState()
    const start = editRange ? editRange.start : 0
    const end = editRange ? editRange.end : lines.length - 1

    const content = lines.slice(start, end + 1).join('\n')
    const { result, converted } = convertHtmlTablesToMd(content)

    if (converted === 0) {
      alert('未找到可转换的 HTML 表格（可能是复杂表格或列数不一致）')
      return
    }

    pushUndo({ lines: [...lines], range: { start, end } })

    const newLines = [...lines]
    const resultLines = result.split('\n')
    newLines.splice(start, end - start + 1, ...resultLines)
    setLines(newLines)
    setEditedRange({ start, end: start + resultLines.length - 1 })
    setCursorLine(start)
    setEditRange(null)
  }

  const handleRegexRightClick = (e: React.MouseEvent, preset: any) => {
    e.preventDefault()
    useAppStore.getState().setEditingRegexPreset(preset)
    useAppStore.getState().setShowRegexPanel(true)
  }

  return (
    <div className="h-6 bg-gray-800 text-gray-300 flex items-center px-4 text-[11px] gap-2 select-none">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">进度:</span>
        <span className="text-gray-200">{progress}</span>
      </div>
      <div className="h-3 w-px bg-gray-600" />
      <div className="flex items-center gap-2">
        <span className="text-gray-500">行:</span>
        <span className="text-gray-200">{lines.length > 0 ? `${cursorLine + 1}/${lines.length}` : '-'}</span>
      </div>
      <div className="h-3 w-px bg-gray-600" />
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${modeColor}`}>{modeText}</span>

      {/* + button */}
      <button onClick={() => setShowRegexPanel(true)}
        className="w-4 h-4 flex items-center justify-center rounded bg-gray-600 hover:bg-gray-500 text-gray-300 text-[10px] font-bold"
        title="管理正则表达式">+</button>

      {/* Copy selection button */}
      <button onClick={handleCopySelection}
        className="px-1.5 py-0.5 rounded bg-gray-600 hover:bg-gray-500 text-gray-300 text-[10px]"
        title="复制选区/全文到剪贴板（可粘贴给AI写正则）">复制</button>

      {/* Table to MD button — fixed, not deletable */}
      <button onClick={handleTableConvert}
        className="px-1.5 py-0.5 rounded bg-emerald-700/50 hover:bg-emerald-600/50 text-emerald-300 text-[10px] font-medium border border-emerald-500/30"
        title="将 HTML 表格转换为 MD 表格（仅限简单表格）">表转MD</button>

      {/* Permanent manager button */}
      <button onClick={() => useAppStore.getState().setShowPermManager(true)}
        className="px-1.5 py-0.5 rounded bg-amber-700/50 hover:bg-amber-600/50 text-amber-300 text-[10px] font-medium border border-amber-500/30"
        title="永久化正则管理器">永久化</button>

      {/* Regex preset buttons — distinct color */}
      {regexPresets.map(p => (
        <button
          key={p.id}
          onClick={() => applyRegex(p)}
          onContextMenu={(e) => handleRegexRightClick(e, p)}
          className="px-1.5 py-0.5 rounded bg-indigo-700/50 hover:bg-indigo-600/50 text-indigo-300 text-[10px] font-medium border border-indigo-500/30"
          title={`左键执行 | 右键编辑\n${p.pattern} → ${p.replacement}`}
        >{p.name}</button>
      ))}

      {editRange && (
        <span className="text-gray-500">选区: {editRange.start + 1}-{editRange.end + 1}</span>
      )}

      <div className="flex-1" />
      <div className="text-gray-500">
        {mode === 'normal' && '拖拽选择 | v/Enter编辑 | Ctrl+V粘贴 | Ctrl+Z撤销'}
        {mode === 'edit_select' && '点击结束行 | Esc 取消'}
        {mode === 'edit_modal' && '编辑中 | Esc 取消 | Ctrl+S 保存'}
      </div>
    </div>
  )
}
