export function localPath(value: string): string | null {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some((char) => char.charCodeAt(0) < 32)
  )
    return null
  const path = value.split(/[?#]/)[0] ?? '/'
  try {
    decodeURIComponent(path)
  } catch {
    return null
  }
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

