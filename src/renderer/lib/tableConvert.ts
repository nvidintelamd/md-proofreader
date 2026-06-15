/**
 * Convert simple HTML tables to Markdown tables.
 * Only converts if all rows have the same number of cells.
 * Complex tables (colspan/rowspan) are left unchanged.
 */
export function convertHtmlTablesToMd(text: string): { result: string; converted: number } {
  let converted = 0

  const result = text.replace(/(<table[^>]*>)([\s\S]*?)(<\/table>)/gi, (_match, openTag, inner, closeTag) => {
    // Extract rows
    const rows: string[][] = []
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      const cells: string[] = []
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        // Check for colspan/rowspan
        const fullTag = cellMatch[0]
        if (/colspan|rowspan/i.test(fullTag)) {
          return _match // Can't convert, return original
        }
        // Clean cell content: strip HTML tags, trim
        const content = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        cells.push(content)
      }
      if (cells.length > 0) rows.push(cells)
    }

    // Check if all rows have same column count
    if (rows.length < 2) return _match
    const colCount = rows[0].length
    if (colCount === 0) return _match
    if (!rows.every(r => r.length === colCount)) return _match

    // Generate MD table
    converted++
    let md = ''
    // Header row
    md += '| ' + rows[0].join(' | ') + ' |\n'
    // Separator
    md += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n'
    // Data rows
    for (let i = 1; i < rows.length; i++) {
      md += '| ' + rows[i].join(' | ') + ' |\n'
    }
    return md.trimEnd()
  })

  return { result, converted }
}
