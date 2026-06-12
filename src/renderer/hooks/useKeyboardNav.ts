import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { loadFileContent } from './useFileLoader'

export function useKeyboardNav() {
  const mode = useAppStore(s => s.mode)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLTextAreaElement) return
    if (e.target instanceof HTMLInputElement) return
    const { mode } = useAppStore.getState()
    if (mode === 'edit_modal') return

    if (mode === 'normal') {
      handleNormalMode(e)
    } else if (mode === 'edit_select') {
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
  const state = useAppStore.getState()
  const { cursorLine, lines, editRange, setCursorLine, setMode, setEditRange } = state

  // Ctrl+Z: undo
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    state.undo()
    return
  }

  // Ctrl+S: save current file
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    const { files, currentFileIndex, lines } = useAppStore.getState()
    const filePath = files[currentFileIndex]?.path
    if (filePath) {
      window.api.writeFile(filePath, lines.join('\n'))
    }
    return
  }

  // ESC: clear selection
  if (e.key === 'Escape' && editRange) {
    e.preventDefault()
    setEditRange(null)
    return
  }

  // Ctrl+V: paste into selection
  if (e.ctrlKey && e.key === 'v') {
    e.preventDefault()
    handlePaste()
    return
  }

  // 'v' with selection: open edit modal
  if (e.key === 'v' && !e.ctrlKey && editRange) {
    e.preventDefault()
    setMode('edit_modal')
    return
  }

  // Enter with selection: open edit modal
  if (e.key === 'Enter' && editRange) {
    e.preventDefault()
    setMode('edit_modal')
    return
  }

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

async function handlePaste() {
  const state = useAppStore.getState()
  const { editRange, lines, mdDir, addImageToCache, pushUndo, setLines, setEditRange, setCursorLine, setEditedRange } = state

  if (!editRange) return

  try {
    const clipboardItems = await navigator.clipboard.read()

    for (const item of clipboardItems) {
      // Check for image in clipboard
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        const blob = await item.getType(imageType)
        const ext = imageType.split('/')[1] === 'jpeg' ? 'jpg' : imageType.split('/')[1]
        const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

        // Convert blob to base64
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
          }
        })
        reader.readAsDataURL(blob)
        const base64Data = await base64Promise

        // Save image to disk
        const saveResult = await window.api.saveImage(mdDir, fileName, base64Data)
        if (saveResult.success) {
          // Create MD image link
          const mdLink = `![](/images/${fileName})`

          // Push undo
          pushUndo({ lines: [...lines], range: editRange })

          // Replace selected lines with image link
          const before = lines.slice(0, editRange.start)
          const after = lines.slice(editRange.end + 1)
          const newLines = [...before, mdLink, ...after]
          setLines(newLines)
          setEditedRange({ start: editRange.start, end: editRange.start })
          setCursorLine(editRange.start)
          setEditRange(null)

          // Cache the image
          const cacheKey = `${mdDir}::/images/${fileName}`
          const url = URL.createObjectURL(blob)
          addImageToCache(cacheKey, url)
        }
        return
      }

      // Text in clipboard
      if (item.types.includes('text/plain')) {
        const textBlob = await item.getType('text/plain')
        const text = await textBlob.text()
        const pasteLines = text.split('\n')

        // Push undo
        pushUndo({ lines: [...lines], range: editRange })

        // Replace selected lines
        const before = lines.slice(0, editRange.start)
        const after = lines.slice(editRange.end + 1)
        const newLines = [...before, ...pasteLines, ...after]
        setLines(newLines)
        setEditedRange({ start: editRange.start, end: editRange.start + pasteLines.length - 1 })
        setCursorLine(editRange.start)
        setEditRange(null)
        return
      }
    }
  } catch (err) {
    console.error('Paste failed:', err)
  }
}
