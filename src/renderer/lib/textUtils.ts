/**
 * Process user-entered text into lines array.
 * Converts literal \n (two characters: backslash + n) to real newlines,
 * then splits into individual lines.
 */
export function textToLines(text: string): string[] {
  const processed = text.replace(/\\n/g, '\n')
  return processed.split('\n')
}
