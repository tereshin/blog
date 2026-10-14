export function textOf(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key]
  return typeof value === 'string' ? value : ''
}

export function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function fileUrl(data: Record<string, unknown> | undefined): string | null {
  const file = data?.file
  if (!file || typeof file !== 'object') return null
  return httpsUrl('url' in file ? file.url : null)
}
