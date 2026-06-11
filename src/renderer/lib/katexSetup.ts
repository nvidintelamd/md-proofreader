import katex from 'katex'
import 'katex/dist/katex.min.css'

export function renderMathInElement(element: HTMLElement): void {
  // Block math: $$...$$
  const blockRegex = /\$\$([\s\S]*?)\$\$/g
  // Inline math: $...$
  const inlineRegex = /(?<!\$)\$(?!\$)(.*?)\$/g

  // Process text nodes
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
  const textNodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node!)
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || ''
    if (!text.includes('$')) continue

    const fragment = document.createDocumentFragment()
    let lastIndex = 0

    // First pass: block math
    let match
    const combined = text

    // Simple approach: replace $$ first, then $
    const parts = combined.split('$$')
    if (parts.length > 1) {
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // Outside block math - check for inline
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
          // Inside block math
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
}
