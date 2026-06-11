import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useKeyboardNav() {
  const {
    blocks, cursorBlock, mode,
    setCursorBlock, setMode, setEditRange
  } = useAppStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if focus is on textarea
    if (e.target instanceof HTMLTextAreaElement) return
    if (mode === 'edit_modal') return

    if (mode === 'normal') {
      handleNormalMode(e)
    } else if (mode === 'edit_select') {
      handleEditSelectMode(e)
    }
  }, [mode, cursorBlock, blocks])

  const handleNormalMode = (e: KeyboardEvent) => {
    const { cursorBlock, blocks, setCursorBlock, setMode, setEditRange } = useAppStore.getState()

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault()
        setCursorBlock(cursorBlock + 1)
        break
      case 'k':
      case 'ArrowUp':
        e.preventDefault()
        setCursorBlock(cursorBlock - 1)
        break
      case 'h':
      case 'ArrowLeft':
        if (e.ctrlKey) {
          // Word jump left - not implemented yet
          e.preventDefault()
        } else {
          e.preventDefault()
          setCursorBlock(0)
        }
        break
      case 'l':
      case 'ArrowRight':
        if (e.ctrlKey) {
          // Word jump right - not implemented yet
          e.preventDefault()
        } else {
          e.preventDefault()
          setCursorBlock(blocks.length - 1)
        }
        break
      case 'PageDown':
        e.preventDefault()
        setCursorBlock(cursorBlock + 10)
        break
      case 'PageUp':
        e.preventDefault()
        setCursorBlock(cursorBlock - 10)
        break
      case 'g':
        // gg = go to top (simplified: just g for now)
        e.preventDefault()
        setCursorBlock(0)
        break
      case 'G':
        e.preventDefault()
        setCursorBlock(blocks.length - 1)
        break
      case 'v':
        e.preventDefault()
        setMode('edit_select')
        setEditRange({ start: cursorBlock, end: cursorBlock })
        break
    }
  }

  const handleEditSelectMode = (e: KeyboardEvent) => {
    const { cursorBlock, editRange, setCursorBlock, setEditRange, setMode } = useAppStore.getState()

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault()
        if (editRange) {
          const newEnd = Math.min(editRange.end + 1, useAppStore.getState().blocks.length - 1)
          setEditRange({ ...editRange, end: newEnd })
          setCursorBlock(newEnd)
        }
        break
      case 'k':
      case 'ArrowUp':
        e.preventDefault()
        if (editRange) {
          const newEnd = Math.max(editRange.end - 1, editRange.start)
          setEditRange({ ...editRange, end: newEnd })
          setCursorBlock(newEnd)
        }
        break
      case 'Enter':
        e.preventDefault()
        setMode('edit_modal')
        break
      case 'Escape':
        e.preventDefault()
        setMode('normal')
        setEditRange(null)
        break
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
