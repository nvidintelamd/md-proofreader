import React, { useState, useEffect, useRef } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

interface PermPreset { id: string; name: string; pattern: string; replacement: string }
interface PresetGroup { id: string; name: string; presetIds: string[] }

export function PermanentManager() {
  const setShowPermManager = useAppStore(s => s.setShowPermManager)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)

  const [presets, setPresets] = useState<PermPreset[]>([])
  const [groups, setGroups] = useState<PresetGroup[]>([])
  const [sortGroup, setSortGroup] = useState<string[]>([])
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [editingPreset, setEditingPreset] = useState<PermPreset | null>(null)
  const [pName, setPName] = useState('')
  const [pPattern, setPPattern] = useState('')
  const [pReplace, setPReplace] = useState('')
  const [packName, setPackName] = useState('')
  const dragIdx = useRef<number | null>(null)

  useEffect(() => {
    window.api.loadPermanent().then(data => {
      setPresets(data.presets || [])
      setGroups(data.groups || [])
    })
  }, [])

  const save = async (newPresets: PermPreset[], newGroups: PresetGroup[]) => {
    setPresets(newPresets)
    setGroups(newGroups)
    await window.api.savePermanent({ presets: newPresets, groups: newGroups })
  }

  // --- Preset CRUD ---
  const savePreset = () => {
    if (!pName.trim() || !pPattern.trim()) return
    const newPresets = editingPreset
      ? presets.map(p => p.id === editingPreset.id ? { ...p, name: pName, pattern: pPattern, replacement: pReplace } : p)
      : [...presets, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: pName, pattern: pPattern, replacement: pReplace }]
    save(newPresets, groups)
    setPName(''); setPPattern(''); setPReplace(''); setEditingPreset(null)
  }

  const deletePreset = (id: string) => {
    save(presets.filter(p => p.id !== id), groups.filter(g => !g.presetIds.includes(id)))
  }

  const editPreset = (p: PermPreset) => {
    setEditingPreset(p); setPName(p.name); setPPattern(p.pattern); setPReplace(p.replacement)
  }

  // --- Bulk import ---
  const handleImport = () => {
    const lines = importText.trim().split('\n').filter(l => l.trim())
    const imported: PermPreset[] = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      if (line.startsWith('#')) {
        // Format: #name\npattern\nreplacement\n
        const name = line.slice(1).trim()
        const pattern = (i + 1 < lines.length) ? lines[i + 1]?.trim() || '' : ''
        const replacement = (i + 2 < lines.length) ? lines[i + 2]?.trim() || '' : ''
        if (pattern) {
          imported.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i, name: name || pattern.slice(0, 4), pattern, replacement })
        }
        i += 3
      } else {
        i++
      }
    }
    if (imported.length === 0) { setImportError('未识别到有效规则，请检查格式'); return }
    const newPresets = [...presets, ...imported]
    save(newPresets, groups)
    setImportText(''); setImportError(''); setShowImport(false)
  }

  // --- Sort group ---
  const addToSortGroup = (id: string) => {
    if (!sortGroup.includes(id)) setSortGroup([...sortGroup, id])
  }

  const removeFromSortGroup = (id: string) => {
    setSortGroup(sortGroup.filter(sid => sid !== id))
  }

  const moveSortItem = (from: number, to: number) => {
    if (to < 0 || to >= sortGroup.length) return
    const newGroup = [...sortGroup]
    const [moved] = newGroup.splice(from, 1)
    newGroup.splice(to, 0, moved)
    setSortGroup(newGroup)
  }

  // --- Pack as button ---
  const handlePackAsButton = () => {
    if (sortGroup.length === 0 || !packName.trim()) return
    const groupPresets = sortGroup.map(id => presets.find(p => p.id === id)).filter(Boolean) as PermPreset[]
    const groupId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const newGroup: PresetGroup = { id: groupId, name: packName.trim(), presetIds: [...sortGroup] }
    const newGroups = [...groups, newGroup]
    save(presets, newGroups)

    // Add packed group as a single button to session (via store)
    // The button executes all presets in order when clicked
    addRegexPreset({
      id: groupId,
      name: packName.trim(),
      pattern: '__GROUP__',
      replacement: groupPresets.map(p => `${p.pattern}|||${p.replacement}`).join(';;;')
    })

    setPackName(''); setSortGroup([])
  }

  const deleteGroup = (id: string) => {
    save(presets, groups.filter(g => g.id !== id))
    // Also remove from session buttons
    useAppStore.getState().deleteRegexPreset(id)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-[#252526] border border-white/10 rounded-lg shadow-2xl w-[800px] max-h-[85vh] flex flex-col text-white text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm">正则管理器</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(!showImport)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[10px]">批量导入</button>
            <button onClick={() => setShowPermManager(false)}
              className="text-white/40 hover:text-white text-lg">×</button>
          </div>
        </div>

        {/* Bulk import */}
        {showImport && (
          <div className="px-4 py-3 border-b border-white/10 space-y-2">
            <div className="text-[10px] text-white/40">格式：每条规则3行（#名称、正则、替换），空行分隔</div>
            <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportError('') }}
              className="w-full h-24 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-xs font-mono focus:outline-none focus:border-blue-500 resize-none"
              placeholder={'#去空格\n^\\s+|\\s+$\n\n#换行替换\n\\\\n\n\n'} />
            {importError && <div className="text-red-400 text-[10px]">{importError}</div>}
            <div className="flex gap-1">
              <button onClick={handleImport} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded">导入</button>
              <button onClick={() => setShowImport(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded">取消</button>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Rule library */}
          <div className="w-1/2 border-r border-white/10 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-[10px] text-white/50 font-bold flex justify-between">
              <span>规则库 ({presets.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* Add/edit form */}
              <div className="space-y-1 bg-[#1e1e1e] rounded p-2 mb-2">
                <input value={pName} onChange={e => setPName(e.target.value)} placeholder="名称" maxLength={4}
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] focus:outline-none focus:border-blue-500" />
                <input value={pPattern} onChange={e => setPPattern(e.target.value)} placeholder="正则表达式"
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] font-mono focus:outline-none focus:border-blue-500" />
                <input value={pReplace} onChange={e => setPReplace(e.target.value)} placeholder="替换内容"
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] font-mono focus:outline-none focus:border-blue-500" />
                <div className="flex gap-1">
                  <button onClick={savePreset} className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 rounded">{editingPreset ? '更新' : '添加'}</button>
                  {editingPreset && <button onClick={() => { setEditingPreset(null); setPName(''); setPPattern(''); setPReplace('') }}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded">取消</button>}
                </div>
              </div>

              {/* Preset list */}
              {presets.map(p => (
                <div key={p.id}
                  onClick={() => addToSortGroup(p.id)}
                  className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1.5 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/30 ml-1 font-mono text-[10px] truncate flex-1">{p.pattern}</span>
                  <button onClick={(e) => { e.stopPropagation(); deletePreset(p.id) }}
                    className="text-red-400 hover:text-red-300 px-1">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Sort group + saved groups */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-[10px] text-white/50 font-bold">
              排序组 ({sortGroup.length})
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Sort group items */}
              {sortGroup.length > 0 ? (
                <div className="space-y-1">
                  {sortGroup.map((sid, idx) => {
                    const p = presets.find(pr => pr.id === sid)
                    if (!p) return null
                    return (
                      <div key={sid}
                        draggable
                        onDragStart={() => { dragIdx.current = idx }}
                        onDragOver={(e) => { e.preventDefault() }}
                        onDrop={() => {
                          if (dragIdx.current !== null && dragIdx.current !== idx) {
                            moveSortItem(dragIdx.current, idx)
                          }
                          dragIdx.current = null
                        }}
                        onContextMenu={(e) => { e.preventDefault(); removeFromSortGroup(sid) }}
                        className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1.5 cursor-move hover:bg-[#2a2a2a] transition-colors"
                        title="右键删除 | 拖拽排序"
                      >
                        <span className="text-white/30 text-[10px]">☰</span>
                        <span className="text-white/40 text-[10px] w-4">{idx + 1}</span>
                        <span className="font-medium flex-1">{p.name}</span>
                        <span className="text-white/30 font-mono text-[10px] truncate max-w-[100px]">{p.pattern}</span>
                      </div>
                    )
                  })}

                  {/* Pack as button */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
                    <input value={packName} onChange={e => setPackName(e.target.value)} placeholder="按钮名称" maxLength={4}
                      className="w-20 px-2 py-1 bg-[#1e1e1e] border border-white/10 rounded text-[10px] focus:outline-none focus:border-blue-500" />
                    <button onClick={handlePackAsButton} disabled={!packName.trim()}
                      className="flex-1 py-1 bg-green-600 hover:bg-green-700 rounded disabled:opacity-40">
                      打包为按钮
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-white/30 text-[10px] text-center py-4">点击左侧规则添加到排序组</div>
              )}

              {/* Saved groups */}
              {groups.length > 0 && (
                <div className="space-y-1 border-t border-white/10 pt-3">
                  <div className="text-[10px] text-white/40 font-bold">已保存的按钮组</div>
                  {groups.map(g => {
                    const groupPresets = g.presetIds.map(id => presets.find(p => p.id === id)).filter(Boolean) as PermPreset[]
                    return (
                      <div key={g.id} className="bg-[#1e1e1e] rounded px-2 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-amber-300">{g.name}</span>
                          <button onClick={() => deleteGroup(g.id)} className="text-red-400 hover:text-red-300 px-1">×</button>
                        </div>
                        <div className="space-y-0.5">
                          {groupPresets.map((p, i) => (
                            <div key={p.id} className="text-[10px] text-white/40 truncate">{i + 1}. {p.name}: {p.pattern}</div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
