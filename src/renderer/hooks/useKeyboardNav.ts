import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'

export function useKeyboardNav() {
  const mode = useAppStore(s => s.mode)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLTextAreaElement) return
    const { mode } = useAppStore.getState()
    if (mode === 'edit_modal') return

    if (mode === 'normal') {
      handleNormalMode(e)
    } else if (mode === 'edit_select') {
      // Only Escape works in edit_select mode (clicks handle selection)
      if (e.key === 'Escape') {
        e.preventDefault()
        useAppStore.getState().setMode('normal')
        useAppStore.getState().setEditRange(null)
      }
    }
  }, [mode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

function handleNormalMode(e: KeyboardEvent) {
  const { cursorLine, lines, setCursorLine, setMode, setEditRange } = useAppStore.getState()

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
      e.preventDefault()
      setCursorLine(cursorLine + 1)
      break
    case 'k':
    case 'ArrowUp':
      e.preventDefault()
      setCursorLine(cursorLine - 1)
      break
    case 'h':
    case 'ArrowLeft':
      e.preventDefault()
      setCursorLine(0)
      break
    case 'l':
    case 'ArrowRight':
      e.preventDefault()
      setCursorLine(lines.length - 1)
      break
    case 'PageDown':
      e.preventDefault()
      setCursorLine(cursorLine + 10)
      break
    case 'PageUp':
      e.preventDefault()
      setCursorLine(cursorLine - 10)
      break
    case 'g':
      e.preventDefault()
      setCursorLine(0)
      break
    case 'G':
      e.preventDefault()
      setCursorLine(lines.length - 1)
      break
    case 'v':
      e.preventDefault()
      setMode('edit_select')
      setEditRange({ start: cursorLine, end: cursorLine })
      break
  }
}
