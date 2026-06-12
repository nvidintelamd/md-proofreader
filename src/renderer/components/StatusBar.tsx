import React from 'react'
import { useAppStore } from '../store/appStore'

export function StatusBar() {
  const files = useAppStore(s => s.files)
  const currentFileIndex = useAppStore(s => s.currentFileIndex)
  const cursorLine = useAppStore(s => s.cursorLine)
  const lines = useAppStore(s => s.lines)
  const mode = useAppStore(s => s.mode)
  const editRange = useAppStore(s => s.editRange)

  const currentFile = files[currentFileIndex]
  const progress = files.length > 0
    ? `${files.filter(f => f.done).length}/${files.length}`
    : '0/0'

  const modeText = {
    normal: '普通',
    edit_select: '选择',
    edit_modal: '编辑'
  }[mode]

  const modeColor = {
    normal: 'bg-gray-700 text-gray-300',
    edit_select: 'bg-yellow-800 text-yellow-200',
    edit_modal: 'bg-blue-800 text-blue-200'
  }[mode]

  return (
    <div className="h-6 bg-gray-800 text-gray-300 flex items-center px-4 text-[11px] gap-4 select-none">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">文件:</span>
        <span className="text-gray-200">{currentFile?.name || '-'}</span>
      </div>

      <div className="h-3 w-px bg-gray-600" />

      <div className="flex items-center gap-2">
        <span className="text-gray-500">进度:</span>
        <span className="text-gray-200">{progress}</span>
      </div>

      <div className="h-3 w-px bg-gray-600" />

      <div className="flex items-center gap-2">
        <span className="text-gray-500">行:</span>
        <span className="text-gray-200">
          {lines.length > 0 ? `${cursorLine + 1}/${lines.length}` : '-'}
        </span>
      </div>

      <div className="h-3 w-px bg-gray-600" />

      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${modeColor}`}>
        {modeText}
      </span>

      {editRange && (
        <span className="text-gray-500">
          选区: {editRange.start + 1}-{editRange.end + 1}
        </span>
      )}

      <div className="flex-1" />

      <div className="text-gray-500">
        {mode === 'normal' && 'hjkl 移动 | v 选择 | PgUp/PgDn 翻页'}
        {mode === 'edit_select' && '点击结束行 | Esc 取消'}
        {mode === 'edit_modal' && '编辑中 | Esc 取消 | Ctrl+S 保存'}
      </div>
    </div>
  )
}
