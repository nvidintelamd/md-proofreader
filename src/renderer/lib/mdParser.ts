import type { Block } from '../store/appStore'

export function parseMdToBlocks(source: string): Block[] {
  const lines = source.split('\n')
  const blocks: Block[] = []
  let blockId = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line - skip
    if (trimmed === '') {
      i++
      continue
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      blocks.push({
        id: blockId++,
        type: 'heading',
        level: headingMatch[1].length,
        lines: [line],
        startLine: i,
        endLine: i
      })
      i++
      continue
    }

    // Math block $$
    if (trimmed === '$$') {
      const mathLines = [line]
      let j = i + 1
      while (j < lines.length && lines[j].trim() !== '$$') {
        mathLines.push(lines[j])
        j++
      }
      if (j < lines.length) {
        mathLines.push(lines[j])
        j++
      }
      blocks.push({
        id: blockId++,
        type: 'math',
        lines: mathLines,
        startLine: i,
        endLine: j - 1
      })
      i = j
      continue
    }

    // List item (- or * or + or 1.)
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) {
      const listLines = [line]
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j]
        const nextTrimmed = nextLine.trim()
        if (nextTrimmed === '') break
        // Continue if it's a list item or indented continuation
        if (/^(\s*[-*+]|\s*\d+\.)\s/.test(nextLine) || /^\s{2,}/.test(nextLine)) {
          listLines.push(nextLine)
          j++
        } else {
          break
        }
      }
      blocks.push({
        id: blockId++,
        type: 'paragraph',
        lines: listLines,
        startLine: i,
        endLine: j - 1
      })
      i = j
      continue
    }

    // Image line (standalone)
    if (/^!\[.*?\]\(.*?\)/.test(trimmed)) {
      blocks.push({
        id: blockId++,
        type: 'image',
        lines: [line],
        startLine: i,
        endLine: i
      })
      i++
      continue
    }

    // Table (starts with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [line]
      let j = i + 1
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        tableLines.push(lines[j])
        j++
      }
      blocks.push({
        id: blockId++,
        type: 'table',
        lines: tableLines,
        startLine: i,
        endLine: j - 1
      })
      i = j
      continue
    }

    // HTML table
    if (trimmed.startsWith('<table')) {
      const tableLines = [line]
      let j = i + 1
      while (j < lines.length && !lines[j].trim().includes('</table>')) {
        tableLines.push(lines[j])
        j++
      }
      if (j < lines.length) {
        tableLines.push(lines[j])
        j++
      }
      blocks.push({
        id: blockId++,
        type: 'table',
        lines: tableLines,
        startLine: i,
        endLine: j - 1
      })
      i = j
      continue
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({
        id: blockId++,
        type: 'hr',
        lines: [line],
        startLine: i,
        endLine: i
      })
      i++
      continue
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const codeLines = [line]
      let j = i + 1
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        codeLines.push(lines[j])
        j++
      }
      if (j < lines.length) {
        codeLines.push(lines[j])
        j++
      }
      blocks.push({
        id: blockId++,
        type: 'code',
        lines: codeLines,
        startLine: i,
        endLine: j - 1
      })
      i = j
      continue
    }

    // Paragraph (default - collect consecutive non-empty lines)
    const paraLines = [line]
    let j = i + 1
    while (j < lines.length) {
      const nextLine = lines[j].trim()
      if (nextLine === '') break
      if (/^#{1,6}\s/.test(nextLine)) break
      if (nextLine === '$$') break
      if (/^!\[.*?\]\(.*?\)/.test(nextLine)) break
      if (nextLine.startsWith('|') && nextLine.endsWith('|')) break
      if (nextLine.startsWith('<table')) break
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(nextLine)) break
      if (nextLine.startsWith('```')) break
      if (/^(\s*[-*+]|\s*\d+\.)\s/.test(lines[j])) break
      paraLines.push(lines[j])
      j++
    }
    blocks.push({
      id: blockId++,
      type: 'paragraph',
      lines: paraLines,
      startLine: i,
      endLine: j - 1
    })
    i = j
  }

  return blocks
}
