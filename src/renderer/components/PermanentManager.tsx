import React, { useState, useEffect, useRef } from 'react'
import { useAppStore, type RegexPreset } from '../store/appStore'

interface PermPreset { id: string; name: string; pattern: string; replacement: string }
interface PresetGroup { id: string; name: string; presetIds: string[] }

export function PermanentManager() {
  const setShowPermManager = useAppStore(s => s.setShowPermManager)
  const addRegexPreset = useAppStore(s => s.addRegexPreset)

  const [presets, setPresets] = useState<PermPreset[]>([])
  const [groups, setGroups] = useState<PresetGroup[]>([])

  // Left: preset editing
  const [editPreset, setEditPreset] = useState<PermPreset | null>(null)
  const [pName, setPName] = useState('')
  const [pPattern, setPPattern] = useState('')
  const [pReplace, setPReplace] = useState('')

  // Right: group editing
  const [editGroup, setEditGroup] = useState<PresetGroup | null>(null)
  const [gName, setGName] = useState('')
  const [gPresetIds, setGPresetIds] = useState<string[]>([])
  const [selectedPermPresetIds, setSelectedPermPresetIds] = useState<Set<string>>(new Set())

  // Drag state for group reorder
  const dragItem = useRef<number | null>(null)

  // Load from permanent store
  useEffect(() => {
    window.api.loadPermanent().then(data => {
      setPresets(data.presets || [])
      setGroups(data.groups || [])
    })
  }, [])

  const savePermanent = async () => {
    await window.api.savePermanent({ presets, groups })
  }

  // --- Left: Preset CRUD ---
  const handleSavePreset = () => {
    if (!pName.trim() || !pPattern.trim()) return
    if (editPreset) {
      setPresets(presets.map(p => p.id === editPreset.id ? { ...p, name: pName, pattern: pPattern, replacement: pReplace } : p))
    } else {
      setPresets([...presets, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: pName, pattern: pPattern, replacement: pReplace }])
    }
    setPName(''); setPPattern(''); setPReplace(''); setEditPreset(null)
    savePermanent()
  }

  const handleEditPreset = (p: PermPreset) => {
    setEditPreset(p); setPName(p.name); setPPattern(p.pattern); setPReplace(p.replacement)
  }

  const handleDeletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id))
    savePermanent()
  }

  // --- Right: Group CRUD ---
  const handleSaveGroup = () => {
    if (!gName.trim()) return
    if (editGroup) {
      setGroups(groups.map(g => g.id === editGroup.id ? { ...g, name: gName, presetIds: gPresetIds } : g))
    } else {
      setGroups([...groups, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: gName, presetIds: gPresetIds }])
    }
    setGName(''); setGPresetIds([]); setEditGroup(null)
    savePermanent()
  }

  const handleEditGroup = (g: PresetGroup) => {
    setEditGroup(g); setGName(g.name); setGPresetIds([...g.presetIds])
    setSelectedPermPresetIds(new Set(g.presetIds))
  }

  const handleDeleteGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id))
    savePermanent()
  }

  const handleAddToGroup = () => {
    const toAdd = Array.from(selectedPermPresetIds).filter(id => !gPresetIds.includes(id))
    setGPresetIds([...gPresetIds, ...toAdd])
    setSelectedPermPresetIds(new Set())
  }

  const handleRemoveFromGroup = (presetId: string) => {
    setGPresetIds(gPresetIds.filter(id => id !== presetId))
  }

  const handleGroupDragStart = (idx: number) => { dragItem.current = idx }
  const handleGroupDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragItem.current === null || dragItem.current === idx) return
    const newIds = [...gPresetIds]
    const [moved] = newIds.splice(dragItem.current, 1)
    newIds.splice(idx, 0, moved)
    setGPresetIds(newIds)
    dragItem.current = idx
  }
  const handleGroupDragEnd = () => { dragItem.current = null }

  // Send group to status bar as regex button
  const handleActivateGroup = (g: PresetGroup) => {
    const groupPresets = g.presetIds.map(id => presets.find(p => p.id === id)).filter(Boolean) as PermPreset[]
    groupPresets.forEach(p => {
      addRegexPreset({ id: p.id, name: p.name, pattern: p.pattern, replacement: p.replacement })
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-[#252526] border border-white/10 rounded-lg shadow-2xl w-[780px] max-h-[85vh] flex flex-col text-white text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm">永久化正则管理器</span>
          <button onClick={() => setShowPermManager(false)} className="text-white/40 hover:text-white text-lg">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Presets */}
          <div className="w-1/2 border-r border-white/10 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-[10px] text-white/50 font-bold">正则库</div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Add/edit preset form */}
              <div className="space-y-1.5 bg-[#1e1e1e] rounded p-2">
                <input value={pName} onChange={e => setPName(e.target.value)} placeholder="名称" maxLength={4}
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] focus:outline-none focus:border-blue-500" />
                <input value={pPattern} onChange={e => setPPattern(e.target.value)} placeholder="正则表达式"
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] font-mono focus:outline-none focus:border-blue-500" />
                <input value={pReplace} onChange={e => setPReplace(e.target.value)} placeholder="替换内容"
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] font-mono focus:outline-none focus:border-blue-500" />
                <div className="flex gap-1">
                  <button onClick={handleSavePreset} className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 rounded text-[10px]">{editPreset ? '更新' : '添加'}</button>
                  {editPreset && <button onClick={() => { setEditPreset(null); setPName(''); setPPattern(''); setPReplace('') }}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[10px]">取消</button>}
                </div>
              </div>
              {/* Preset list */}
              {presets.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1.5">
                  <input type="checkbox" checked={selectedPermPresetIds.has(p.id)}
                    onChange={(e) => {
                      const s = new Set(selectedPermPresetIds)
                      e.target.checked ? s.add(p.id) : s.delete(p.id)
                      setSelectedPermPresetIds(s)
                    }}
                    className="w-3 h-3" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditPreset(p)}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-white/30 ml-1 font-mono text-[10px] truncate">{p.pattern}</span>
                  </div>
                  <button onClick={() => handleDeletePreset(p.id)} className="text-red-400 hover:text-red-300 px-1">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Groups */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-[10px] text-white/50 font-bold">选配组</div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Add group form */}
              <div className="space-y-1.5 bg-[#1e1e1e] rounded p-2">
                <input value={gName} onChange={e => setGName(e.target.value)} placeholder="选配组名称"
                  className="w-full px-2 py-1 bg-[#252526] border border-white/10 rounded text-[11px] focus:outline-none focus:border-blue-500" />
                <button onClick={handleAddToGroup} disabled={selectedPermPresetIds.size === 0}
                  className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[10px] disabled:opacity-40">
                  添加选中正则到组 ({selectedPermPresetIds.size})
                </button>
                <div className="flex gap-1">
                  <button onClick={handleSaveGroup} className="flex-1 py-1 bg-green-600 hover:bg-green-700 rounded text-[10px]">{editGroup ? '更新组' : '保存组'}</button>
                  {editGroup && <button onClick={() => { setEditGroup(null); setGName(''); setGPresetIds([]) }}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[10px]">取消</button>}
                </div>
              </div>
              {/* Group preset list (draggable) */}
              {gPresetIds.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-white/40">组内正则（拖拽排序）</div>
                  {gPresetIds.map((pid, idx) => {
                    const p = presets.find(pr => pr.id === pid)
                    if (!p) return null
                    return (
                      <div key={pid} draggable onDragStart={() => handleGroupDragStart(idx)}
                        onDragOver={(e) => handleGroupDragOver(e, idx)} onDragEnd={handleGroupDragEnd}
                        className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1 cursor-move">
                        <span className="text-white/30 text-[10px]">☰</span>
                        <span className="font-medium flex-1">{p.name}</span>
                        <span className="text-white/30 font-mono text-[10px] truncate max-w-[120px]">{p.pattern}</span>
                        <button onClick={() => handleRemoveFromGroup(pid)} className="text-red-400 hover:text-red-300 px-1">×</button>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Saved groups */}
              {groups.length > 0 && (
                <div className="space-y-1 border-t border-white/10 pt-2">
                  <div className="text-[10px] text-white/40">已保存的选配组</div>
                  {groups.map(g => (
                    <div key={g.id} className="flex items-center gap-1.5 bg-[#1e1e1e] rounded px-2 py-1.5">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditGroup(g)}>
                        <span className="font-medium">{g.name}</span>
                        <span className="text-white/30 ml-1 text-[10px]">{g.presetIds.length} 条规则</span>
                      </div>
                      <button onClick={() => handleActivateGroup(g)}
                        className="text-green-400 hover:text-green-300 px-1 text-[10px]" title="激活到状态栏">激活</button>
                      <button onClick={() => handleDeleteGroup(g.id)} className="text-red-400 hover:text-red-300 px-1">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
