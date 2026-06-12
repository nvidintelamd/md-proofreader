import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useKeyboardNav() {
  const {
    blocks, cursorBlock, mode,
    setCursorBlock, setMode, setEditRange
  } = useAppStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
          e.preventDefault()
        } else {
          e.preventDefault()
          setCursorBlock(0)
        }
        break
      case 'l':
      case 'ArrowRight':
        if (e.ctrlKey) {
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
    const { setMode, setEditRange } = useAppStore.getState()

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setMode('normal')
        setEditRange(null)
        break
      // In click-to-select mode, j/k do nothing - user clicks to select
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
