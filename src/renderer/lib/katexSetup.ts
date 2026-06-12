import katex from 'katex'
import 'katex/dist/katex.min.css'

export function renderMathInElement(element: HTMLElement): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
  const textNodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node!)
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || ''
    if (!text.includes('$')) continue

    const parts = text.split('$$')
    if (parts.length <= 1) {
      // No block math, check for inline math
      const inlineParts = text.split('$')
      if (inlineParts.length <= 1) continue

      const fragment = document.createDocumentFragment()
      for (let j = 0; j < inlineParts.length; j++) {
        if (j % 2 === 0) {
          if (inlineParts[j]) fragment.appendChild(document.createTextNode(inlineParts[j]))
        } else {
          try {
            const span = document.createElement('span')
            span.className = 'inline-math'
            katex.render(inlineParts[j], span, { throwOnError: false, displayMode: false })
            fragment.appendChild(span)
          } catch {
            fragment.appendChild(document.createTextNode('$' + inlineParts[j] + '$'))
          }
        }
      }
      textNode.parentNode?.replaceChild(fragment, textNode)
      continue
    }

    // Has block math
    const fragment = document.createDocumentFragment()
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i]) {
          const inlineParts = parts[i].split('$')
          for (let j = 0; j < inlineParts.length; j++) {
            if (j % 2 === 0) {
              if (inlineParts[j]) fragment.appendChild(document.createTextNode(inlineParts[j]))
            } else {
              try {
                const span = document.createElement('span')
                span.className = 'inline-math'
                katex.render(inlineParts[j], span, { throwOnError: false, displayMode: false })
                fragment.appendChild(span)
              } catch {
                fragment.appendChild(document.createTextNode('$' + inlineParts[j] + '$'))
              }
            }
          }
        }
      } else {
        try {
          const div = document.createElement('div')
          div.className = 'block-math my-2'
          katex.render(parts[i].trim(), div, { throwOnError: false, displayMode: true })
          fragment.appendChild(div)
        } catch {
          fragment.appendChild(document.createTextNode('$$' + parts[i] + '$$'))
        }
      }
    }
    textNode.parentNode?.replaceChild(fragment, textNode)
  }
}

export function renderMathString(math: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(math.trim(), { throwOnError: false, displayMode })
  } catch {
    return math
  }
}
