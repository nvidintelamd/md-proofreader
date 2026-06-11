const imageCache = new Map<string, string>()

export async function resolveImagePath(
  mdDir: string,
  imagePath: string,
  addImageToCache: (key: string, url: string) => void
): Promise<string> {
  const cacheKey = `${mdDir}::${imagePath}`
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  try {
    const result = await window.api.readImage(mdDir, imagePath)
    if (result.success && result.dataUrl) {
      imageCache.set(cacheKey, result.dataUrl)
      addImageToCache(cacheKey, result.dataUrl)
      return result.dataUrl
    }
  } catch {
    // ignore
  }

  return imagePath
}

export function extractImagePaths(content: string): string[] {
  const regex = /!\[.*?\]\((.*?)\)/g
  const paths: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) paths.push(match[1].trim())
  }
  return [...new Set(paths)]
}
